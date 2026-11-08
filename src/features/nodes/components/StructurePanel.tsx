import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ChevronRight,
	CornerDownRight,
	Plus,
	Shapes,
	StickyNote,
	Trash2,
	Type,
	X,
} from "lucide-react";
import Button from "@src/components/ui/button/Button";
import {
	BOARD_COLORS,
	BOARD_SHAPES,
	BOARD_TEXT_MAX,
	type BoardColor,
	type BoardLayoutMode,
	type BoardNodeType,
	type BoardShape,
} from "@src/lib/db/types";
import { PALETTE } from "@src/features/nodes/lib/palette";
import { serializeOutline, type OutlineGraph } from "@src/features/nodes/lib/outline";
import { childrenOf, descendantsOf, treeRows } from "@src/features/nodes/lib/structure";
import { toBoardEdges, toBoardNodes } from "@src/features/nodes/lib/serialize";
import type { FlowEdge, FlowNode, FlowNodeData } from "@src/features/nodes/lib/serialize";
import type { EdgePatch } from "@src/features/nodes/lib/useBoardEditor";
import OutlinePanel from "@src/features/nodes/components/OutlinePanel";

import { SHAPE_LABEL } from "@src/features/nodes/lib/labels";

/** The editor actions the panel calls. Mirrors what useBoardEditor returns. */
export interface StructureActions {
	addNode: (type: BoardNodeType, options?: { shape?: BoardShape }) => string;
	addChild: (parentId: string, type?: BoardNodeType, options?: { shape?: BoardShape }) => string;
	addSibling: (id: string, type?: BoardNodeType) => string;
	updateNodeData: (id: string, patch: Partial<FlowNodeData>) => void;
	setSelectedColor: (color: BoardColor) => void;
	setSelectedShape: (shape: BoardShape) => void;
	updateEdge: (id: string, patch: EdgePatch) => void;
	indentNode: (id: string) => void;
	outdentNode: (id: string) => void;
	moveNode: (id: string, direction: -1 | 1) => void;
	link: (source: string, target: string) => void;
	unlink: (source: string, target: string) => void;
	removeNodes: (ids: readonly string[]) => void;
	removeSubtree: (id: string) => void;
	selectOnly: (ids: readonly string[]) => void;
	applyOutlineGraph: (graph: OutlineGraph) => void;
	addGridRow: () => void;
	addGridColumn: () => void;
	removeGridRow: (row: number) => void;
	removeGridColumn: (column: number) => void;
}

interface StructurePanelProps {
	layoutMode: BoardLayoutMode;
	nodes: FlowNode[];
	edges: FlowEdge[];
	treeRootId: string | null;
	/** Grid boards: how many columns the nodes are cut into. */
	gridColumns: number;
	onTreeRoot: (id: string | null) => void;
	outline: string;
	onOutlineChange: (text: string) => void;
	actions: StructureActions;
	/** Closes the panel (used on small screens where it is a sheet). */
	onClose?: () => void;
}

const BTN =
	"inline-flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-md px-2 text-xs text-gray-800 dark:text-gray-100 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none md:min-h-8 md:min-w-8";
const SELECT =
	"min-h-9 rounded-md bg-black/5 px-1 text-xs text-gray-800 dark:bg-white/10 dark:text-gray-100 md:min-h-8";
const TOGGLED = "ring-2 ring-cyan-400";

const textOf = (node: FlowNode): string =>
	(node.type === "note" ? node.data.title : node.data.text) ?? "";

const TYPE_ICON: Record<BoardNodeType, React.ReactNode> = {
	note: <StickyNote className="h-3.5 w-3.5" />,
	shape: <Shapes className="h-3.5 w-3.5" />,
	text: <Type className="h-3.5 w-3.5" />,
};

interface RowProps {
	node: FlowNode;
	depth: number;
	mode: BoardLayoutMode;
	isFirst: boolean;
	isLast: boolean;
	selected: boolean;
	hasChildren: boolean;
	/** Small position note shown above the label (grid cells). */
	caption?: string;
	/** Targets this node links to, and every other node it could link to. */
	linkedTo: FlowNode[];
	linkable: FlowNode[];
	actions: StructureActions;
	onEnter: () => void;
	registerInput: (id: string, element: HTMLInputElement | null) => void;
}

const Row: React.FC<RowProps> = ({
	node,
	depth,
	mode,
	isFirst,
	isLast,
	selected,
	hasChildren,
	caption,
	linkedTo,
	linkable,
	actions,
	onEnter,
	registerInput,
}) => {
	const value = textOf(node);
	const commit = (next: string) => {
		const clean = next.slice(0, BOARD_TEXT_MAX);
		if (clean === value) return;
		actions.updateNodeData(node.id, node.type === "note" ? { title: clean } : { text: clean });
	};
	const isTree = mode === "tree";
	const showLinks = mode === "graph" || mode === "free";

	const remove = () => {
		if (isTree && hasChildren) {
			if (!window.confirm("Delete this node and everything below it?")) return;
			actions.removeSubtree(node.id);
		} else {
			actions.removeNodes([node.id]);
		}
	};

	return (
		<li
			className={`rounded-lg border px-1.5 py-1 ${
				selected
					? "border-cyan-400 bg-cyan-500/10"
					: "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
			}`}
			style={{ marginLeft: depth * 14 }}
			onClick={() => actions.selectOnly([node.id])}
		>
			{caption && (
				<p className="px-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
					{caption}
				</p>
			)}
			<div className="flex flex-wrap items-center gap-1">
				<span
					aria-hidden
					className={`h-3 w-3 shrink-0 rounded-full border border-white/60 ${PALETTE[node.data.color].swatch}`}
				/>
				<span className="text-gray-600 dark:text-gray-300" title={node.type}>
					{TYPE_ICON[node.type ?? "note"]}
				</span>
				<input
					ref={(element) => registerInput(node.id, element)}
					// Remount when the text changes elsewhere (undo/redo, canvas edit).
					key={`${node.id}:${value}`}
					aria-label="Node label"
					placeholder="Untitled"
					defaultValue={value}
					maxLength={BOARD_TEXT_MAX}
					onFocus={() => actions.selectOnly([node.id])}
					onBlur={(event) => commit(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							commit(event.currentTarget.value);
							if (isTree) onEnter();
							else event.currentTarget.blur();
						} else if (isTree && event.key === "Tab") {
							event.preventDefault();
							commit(event.currentTarget.value);
							if (event.shiftKey) actions.outdentNode(node.id);
							else actions.indentNode(node.id);
						} else if (event.key === "Backspace" && isTree && event.currentTarget.value === "") {
							if (!hasChildren) {
								event.preventDefault();
								actions.removeNodes([node.id]);
							}
						}
					}}
					className="min-h-9 min-w-0 flex-1 rounded-md bg-black/5 px-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-cyan-400 dark:bg-white/10 dark:text-gray-100 md:min-h-8"
				/>
				{node.type === "shape" && (
					<select
						aria-label="Shape"
						value={node.data.shape ?? "rounded"}
						onChange={(event) =>
							actions.updateNodeData(node.id, {
								shape: event.target.value as BoardShape,
							})
						}
						className={SELECT}
					>
						{BOARD_SHAPES.map((shape) => (
							<option key={shape} value={shape} className="text-black">
								{SHAPE_LABEL[shape]}
							</option>
						))}
					</select>
				)}
			</div>
			<div className="mt-1 flex flex-wrap items-center gap-1">
				{isTree && (
					<>
						<Button
							className={BTN}
							title="Add child"
							aria-label="Add child"
							onClick={() => actions.addChild(node.id)}
						>
							<CornerDownRight className="h-4 w-4" />
						</Button>
						<Button
							className={BTN}
							title="Make a child of the node above"
							aria-label="Indent"
							onClick={() => actions.indentNode(node.id)}
							disabled={isFirst && depth === 0}
						>
							<ArrowRight className="h-4 w-4" />
						</Button>
						<Button
							className={BTN}
							title="Move up a level"
							aria-label="Outdent"
							onClick={() => actions.outdentNode(node.id)}
							disabled={depth === 0}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</>
				)}
				<Button
					className={BTN}
					title="Move up"
					aria-label="Move up"
					onClick={() => actions.moveNode(node.id, -1)}
					disabled={isFirst}
				>
					<ArrowUp className="h-4 w-4" />
				</Button>
				<Button
					className={BTN}
					title="Move down"
					aria-label="Move down"
					onClick={() => actions.moveNode(node.id, 1)}
					disabled={isLast}
				>
					<ArrowDown className="h-4 w-4" />
				</Button>
				<Button
					className={`${BTN} hover:!text-red-600`}
					title="Delete"
					aria-label="Delete node"
					onClick={remove}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
			{showLinks && (
				<div className="mt-1 flex flex-wrap items-center gap-1">
					{linkedTo.map((target) => (
						<span
							key={target.id}
							className="inline-flex items-center gap-0.5 rounded-full bg-black/10 py-0.5 pl-2 pr-0.5 text-xs text-gray-800 dark:bg-white/15 dark:text-gray-100"
						>
							<ChevronRight className="h-3 w-3" />
							{textOf(target) || "Untitled"}
							<button
								type="button"
								aria-label={`Remove link to ${textOf(target) || "Untitled"}`}
								className="rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/20"
								onClick={() => actions.unlink(node.id, target.id)}
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					))}
					{linkable.length > 0 && (
						<select
							aria-label="Link to"
							value=""
							onChange={(event) => {
								if (event.target.value) actions.link(node.id, event.target.value);
							}}
							className={`${SELECT} max-w-40`}
						>
							<option value="" className="text-black">
								Link to…
							</option>
							{linkable.map((target) => (
								<option key={target.id} value={target.id} className="text-black">
									{textOf(target) || "Untitled"}
								</option>
							))}
						</select>
					)}
				</div>
			)}
		</li>
	);
};

const StructurePanel: React.FC<StructurePanelProps> = ({
	layoutMode,
	nodes,
	edges,
	treeRootId,
	gridColumns,
	onTreeRoot,
	outline,
	onOutlineChange,
	actions,
	onClose,
}) => {
	const [showText, setShowText] = useState(false);
	const [shape, setShape] = useState<BoardShape>("rounded");
	const inputs = useRef(new Map<string, HTMLInputElement>());
	const [pendingFocus, setPendingFocus] = useState<string | null>(null);

	const registerInput = useMemo(
		() => (id: string, element: HTMLInputElement | null) => {
			if (element) inputs.current.set(id, element);
			else inputs.current.delete(id);
		},
		[],
	);

	// Focus a freshly added row once it has rendered.
	useEffect(() => {
		if (!pendingFocus) return;
		const element = inputs.current.get(pendingFocus);
		if (element) {
			element.focus();
			setPendingFocus(null);
		}
	}, [pendingFocus, nodes]);

	const isTree = layoutMode === "tree";
	const isGrid = layoutMode === "grid";
	const gridRows = Math.max(1, Math.ceil(nodes.length / Math.max(1, gridColumns)));
	const rows = useMemo(
		() =>
			isTree
				? treeRows(nodes, edges, treeRootId)
				: nodes.map((node) => ({ id: node.id, depth: 0 })),
		[isTree, nodes, edges, treeRootId],
	);
	const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

	const selectedNodes = nodes.filter((node) => node.selected);
	const selectedEdges = edges.filter((edge) => edge.selected);
	const selectedEdge =
		selectedEdges.length === 1 && selectedNodes.length === 0 ? selectedEdges[0] : null;
	const activeColor = selectedNodes[0]?.data.color ?? null;
	const canShape = selectedNodes.some((node) => node.type === "shape");

	const add = (type: BoardNodeType) => {
		// In a tree, a single selected node gets the new node as its child.
		const id =
			isTree && selectedNodes.length === 1
				? actions.addChild(selectedNodes[0].id, type, { shape })
				: actions.addNode(type, { shape });
		setPendingFocus(id);
	};

	const toggleText = () => {
		if (!showText && !outline) {
			onOutlineChange(serializeOutline(toBoardNodes(nodes), toBoardEdges(edges)));
		}
		setShowText((open) => !open);
	};

	const outlineGraph = useMemo(
		() =>
			showText
				? { nodes: toBoardNodes(nodes), edges: toBoardEdges(edges) }
				: { nodes: [], edges: [] },
		[showText, nodes, edges],
	);

	const rootOptions = isTree
		? nodes.map((node, index) => ({
				id: node.id,
				label: textOf(node) || `Node ${index + 1}`,
			}))
		: [];

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex items-center justify-between gap-2 border-b border-white/20 px-2 py-1.5">
				<h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Structure</h2>
				{onClose && (
					<Button className={BTN} onClick={onClose} aria-label="Close panel" title="Close panel">
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>

			<div className="flex flex-col gap-2 border-b border-white/20 p-2">
				<div className="flex flex-wrap items-center gap-1">
					<Button className={BTN} onClick={() => add("shape")} title="Add shape">
						<Plus className="h-4 w-4" />
						<Shapes className="h-4 w-4" />
						Shape
					</Button>
					<Button className={BTN} onClick={() => add("note")} title="Add note">
						<StickyNote className="h-4 w-4" />
						Note
					</Button>
					<Button className={BTN} onClick={() => add("text")} title="Add text">
						<Type className="h-4 w-4" />
						Text
					</Button>
				</div>
				<div className="flex flex-wrap items-center gap-1">
					<label className="text-xs text-gray-700 dark:text-gray-200" htmlFor="panel-shape">
						Shape
					</label>
					<select
						id="panel-shape"
						value={shape}
						onChange={(event) => {
							const next = event.target.value as BoardShape;
							setShape(next);
							// Also reshape any selected shape nodes.
							if (canShape) actions.setSelectedShape(next);
						}}
						className={SELECT}
						title={canShape ? "Applies to selected shapes and new shapes" : "Used for new shapes"}
					>
						{BOARD_SHAPES.map((value) => (
							<option key={value} value={value} className="text-black">
								{SHAPE_LABEL[value]}
							</option>
						))}
					</select>
				</div>
				<div className="flex flex-wrap items-center gap-1" role="group" aria-label="Colour">
					{BOARD_COLORS.map((color) => (
						<Button
							key={color}
							title={PALETTE[color].label}
							aria-label={`${PALETTE[color].label} colour`}
							aria-pressed={activeColor === color}
							disabled={activeColor === null}
							onClick={() => actions.setSelectedColor(color)}
							className={`h-7 w-7 rounded-full border border-white/60 disabled:opacity-30 ${
								PALETTE[color].swatch
							} ${activeColor === color ? "ring-2 ring-offset-1 ring-cyan-400" : ""}`}
						/>
					))}
				</div>
				{isTree && (
					<select
						aria-label="Tree root"
						value={treeRootId ?? ""}
						onChange={(event) => onTreeRoot(event.target.value || null)}
						className={`${SELECT} max-w-full`}
					>
						<option value="" className="text-black">
							Root: auto
						</option>
						{rootOptions.map((option) => (
							<option key={option.id} value={option.id} className="text-black">
								{option.label}
							</option>
						))}
					</select>
				)}
				{isGrid && (
					<div className="flex flex-col gap-1" aria-label="Grid size">
						<p className="text-xs text-gray-700 dark:text-gray-200">
							{gridRows} {gridRows === 1 ? "row" : "rows"} × {gridColumns}{" "}
							{gridColumns === 1 ? "column" : "columns"}
						</p>
						<div className="flex flex-wrap items-center gap-1">
							<Button className={BTN} onClick={actions.addGridRow} title="Add a row of nodes">
								<Plus className="h-4 w-4" />
								Row
							</Button>
							<Button className={BTN} onClick={actions.addGridColumn} title="Add a column of nodes">
								<Plus className="h-4 w-4" />
								Column
							</Button>
						</div>
						<div className="flex flex-wrap items-center gap-1">
							{Array.from({ length: gridColumns }, (_unused, column) => (
								<Button
									key={column}
									className={BTN}
									disabled={gridColumns <= 1}
									onClick={() => actions.removeGridColumn(column)}
									aria-label={`Remove column ${column + 1}`}
									title={`Remove column ${column + 1}`}
								>
									C{column + 1}
									<X className="h-3 w-3" />
								</Button>
							))}
						</div>
					</div>
				)}
				{selectedEdge && (
					<div className="flex flex-wrap items-center gap-1">
						<input
							// Remount when the label changes elsewhere (undo/redo).
							key={`${selectedEdge.id}:${
								typeof selectedEdge.label === "string" ? selectedEdge.label : ""
							}`}
							aria-label="Edge label"
							placeholder="Edge label"
							defaultValue={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
							maxLength={80}
							onBlur={(event) => {
								const next = event.target.value.trim();
								const current = typeof selectedEdge.label === "string" ? selectedEdge.label : "";
								if (next !== current) actions.updateEdge(selectedEdge.id, { label: next });
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter") event.currentTarget.blur();
							}}
							className="min-h-9 w-32 rounded-md bg-black/5 px-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-cyan-400 dark:bg-white/10 dark:text-gray-100 md:min-h-8"
						/>
						<Button
							className={`${BTN} ${selectedEdge.markerEnd ? TOGGLED : ""}`}
							aria-pressed={Boolean(selectedEdge.markerEnd)}
							onClick={() =>
								actions.updateEdge(selectedEdge.id, {
									arrow: !selectedEdge.markerEnd,
								})
							}
							title="Toggle arrow"
						>
							<ArrowRight className="h-4 w-4" />
							Arrow
						</Button>
					</div>
				)}
			</div>

			<ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2" aria-label="Nodes">
				{rows.length === 0 && (
					<li className="p-2 text-sm text-gray-600 dark:text-gray-300">
						No nodes yet. Use Shape, Note or Text above to add one.
					</li>
				)}
				{rows.map((row, index) => {
					const node = byId.get(row.id);
					if (!node) return null;
					const linkedIds = childrenOf(edges, node.id);
					const blocked = new Set([node.id, ...linkedIds]);
					const gridRow = Math.floor(index / Math.max(1, gridColumns));
					const gridColumn = index % Math.max(1, gridColumns);
					return (
						<Fragment key={node.id}>
							{isGrid && gridColumn === 0 && (
								<li className="flex items-center justify-between px-1 pt-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
									Row {gridRow + 1}
									<Button
										className={`${BTN} hover:!text-red-600`}
										disabled={gridRows <= 1}
										onClick={() => actions.removeGridRow(gridRow)}
										aria-label={`Remove row ${gridRow + 1}`}
										title={`Remove row ${gridRow + 1}`}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</li>
							)}
							<Row
								key={node.id}
								node={node}
								depth={row.depth}
								mode={layoutMode}
								isFirst={index === 0}
								isLast={index === rows.length - 1}
								selected={Boolean(node.selected)}
								hasChildren={isTree && descendantsOf(edges, node.id).length > 0}
								caption={isGrid ? `Row ${gridRow + 1} · Column ${gridColumn + 1}` : undefined}
								linkedTo={linkedIds
									.map((id) => byId.get(id))
									.filter((n): n is FlowNode => Boolean(n))}
								linkable={nodes.filter((other) => !blocked.has(other.id))}
								actions={actions}
								onEnter={() => setPendingFocus(actions.addSibling(node.id))}
								registerInput={registerInput}
							/>
						</Fragment>
					);
				})}
			</ul>

			<div className="border-t border-white/20">
				<Button
					className={`${BTN} m-2 ${showText ? TOGGLED : ""}`}
					aria-pressed={showText}
					onClick={toggleText}
					title="Import or export the structure as text"
				>
					Text import/export
				</Button>
				{showText && (
					<OutlinePanel
						text={outline}
						onTextChange={onOutlineChange}
						graph={outlineGraph}
						onApply={actions.applyOutlineGraph}
					/>
				)}
			</div>
		</div>
	);
};

export default StructurePanel;

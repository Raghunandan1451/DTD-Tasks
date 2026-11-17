import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import {
	BOARD_COLORS,
	type BoardLayoutMode,
	type BoardNodeType,
	type BoardShape,
} from "@src/lib/db/types";
import { PALETTE } from "@src/features/nodes/lib/palette";
import { serializeOutline } from "@src/features/nodes/lib/outline";
import { childrenOf, descendantsOf, treeRows } from "@src/features/nodes/lib/structure";
import { toBoardEdges, toBoardNodes } from "@src/features/nodes/lib/serialize";
import type { FlowEdge, FlowNode } from "@src/features/nodes/lib/serialize";
import OutlinePanel from "@src/features/nodes/components/OutlinePanel";
import type { StructureActions } from "@src/features/nodes/components/structure/types";
import { BTN, SELECT, TOGGLED, textOf } from "@src/features/nodes/components/structure/structureShared";
import { Row } from "@src/features/nodes/components/structure/StructureRow";
import { AddBar } from "@src/features/nodes/components/structure/AddBar";
import { GridSizeControls } from "@src/features/nodes/components/structure/GridSizeControls";
import { EdgeLabelEditor } from "@src/features/nodes/components/structure/EdgeLabelEditor";

interface StructurePanelProps {
	layoutMode: BoardLayoutMode;
	nodes: FlowNode[];
	edges: FlowEdge[];
	treeRootId: string | null;
	/** Grid boards: how many columns the nodes are cut into. */
	gridColumns: number;
	/** Names of grid rows and columns, by index; blank or missing means unnamed. */
	gridRowLabels: readonly string[];
	gridColumnLabels: readonly string[];
	onTreeRoot: (id: string | null) => void;
	outline: string;
	onOutlineChange: (text: string) => void;
	actions: StructureActions;
	/** Closes the panel (used on small screens where it is a sheet). */
	onClose?: () => void;
}
const StructurePanel: React.FC<StructurePanelProps> = ({
	layoutMode,
	nodes,
	edges,
	treeRootId,
	gridColumns,
	gridRowLabels,
	gridColumnLabels,
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
	const gridRows = Math.max(
		1,
		Math.ceil(nodes.length / Math.max(1, gridColumns)),
	);
	const rows = useMemo(
		() =>
			isTree
				? treeRows(nodes, edges, treeRootId)
				: nodes.map((node) => ({ id: node.id, depth: 0 })),
		[isTree, nodes, edges, treeRootId],
	);
	const byId = useMemo(
		() => new Map(nodes.map((node) => [node.id, node])),
		[nodes],
	);

	const selectedNodes = nodes.filter((node) => node.selected);
	const selectedEdges = edges.filter((edge) => edge.selected);
	const selectedEdge =
		selectedEdges.length === 1 && selectedNodes.length === 0
			? selectedEdges[0]
			: null;
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

	const changeShape = (next: BoardShape) => {
		setShape(next);
		// Also reshape any selected shape nodes.
		if (canShape) actions.setSelectedShape(next);
	};

	const toggleText = () => {
		if (!showText && !outline) {
			onOutlineChange(
				serializeOutline(toBoardNodes(nodes), toBoardEdges(edges)),
			);
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
				<h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
					Structure
				</h2>
				{onClose && (
					<Button
						className={BTN}
						onClick={onClose}
						aria-label="Close panel"
						title="Close panel"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>

			<div className="flex flex-col gap-2 border-b border-white/20 p-2">
				<AddBar
					shape={shape}
					canShape={canShape}
					onAdd={add}
					onShapeChange={changeShape}
				/>
				<div
					className="flex flex-wrap items-center gap-1"
					role="group"
					aria-label="Colour"
				>
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
						onChange={(event) =>
							onTreeRoot(event.target.value || null)
						}
						className={`${SELECT} max-w-full`}
					>
						<option value="" className="text-black">
							Root: auto
						</option>
						{rootOptions.map((option) => (
							<option
								key={option.id}
								value={option.id}
								className="text-black"
							>
								{option.label}
							</option>
						))}
					</select>
				)}
				{isGrid && (
					<GridSizeControls
						gridRows={gridRows}
						gridColumns={gridColumns}
						gridColumnLabels={gridColumnLabels}
						actions={actions}
					/>
				)}
				{selectedEdge && (
					<EdgeLabelEditor edge={selectedEdge} actions={actions} />
				)}
			</div>

			<ul
				className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-hide p-2"
				aria-label="Nodes"
			>
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
					const gridRow = Math.floor(
						index / Math.max(1, gridColumns),
					);
					const gridColumn = index % Math.max(1, gridColumns);
					return (
						<Fragment key={node.id}>
							{isGrid && gridColumn === 0 && (
								<li className="flex items-center justify-between px-1 pt-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
									{gridRowLabels[gridRow] ||
										`Row ${gridRow + 1}`}
									<Button
										className={`${BTN} hover:!text-red-600`}
										disabled={gridRows <= 1}
										onClick={() =>
											actions.removeGridRow(gridRow)
										}
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
								hasChildren={
									isTree &&
									descendantsOf(edges, node.id).length > 0
								}
								caption={
									isGrid
										? `${gridRowLabels[gridRow] || `Row ${gridRow + 1}`} · ${gridColumnLabels[gridColumn] || `Column ${gridColumn + 1}`}`
										: undefined
								}
								linkedTo={linkedIds
									.map((id) => byId.get(id))
									.filter((n): n is FlowNode => Boolean(n))}
								linkable={nodes.filter(
									(other) => !blocked.has(other.id),
								)}
								actions={actions}
								onEnter={() =>
									setPendingFocus(actions.addSibling(node.id))
								}
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

export type { StructureActions } from "@src/features/nodes/components/structure/types";

import { RowLinks } from "@src/features/nodes/components/structure/RowLinks";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerDownRight, Shapes, StickyNote, Trash2, Type } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { BOARD_SHAPES, BOARD_TEXT_MAX, type BoardLayoutMode, type BoardNodeType, type BoardShape } from "@src/lib/db/types";
import { PALETTE } from "@src/features/nodes/lib/palette";
import type { FlowNode } from "@src/features/nodes/lib/serialize";
import { SHAPE_LABEL } from "@src/features/nodes/lib/labels";
import { StructureActions } from "@src/features/nodes/components/structure/types";
import { BTN, SELECT, textOf } from "@src/features/nodes/components/structure/structureShared";

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

export const Row: React.FC<RowProps> = ({
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
		actions.updateNodeData(
			node.id,
			node.type === "note" ? { title: clean } : { text: clean },
		);
	};
	// Notes keep their description in `text` (the title is `title`).
	const description = node.data.text ?? "";
	const commitDescription = (next: string) => {
		const clean = next.slice(0, BOARD_TEXT_MAX);
		if (clean === description) return;
		actions.updateNodeData(node.id, { text: clean });
	};
	const isTree = mode === "tree";
	const showLinks = mode === "graph" || mode === "free";
	const canPickLink = showLinks && linkable.length > 0;

	const remove = () => {
		if (isTree && hasChildren) {
			if (!window.confirm("Delete this node and everything below it?"))
				return;
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
				<span
					className="text-gray-600 dark:text-gray-300"
					title={node.type}
				>
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
						} else if (
							event.key === "Backspace" &&
							isTree &&
							event.currentTarget.value === ""
						) {
							if (!hasChildren) {
								event.preventDefault();
								actions.removeNodes([node.id]);
							}
						}
					}}
					className="min-h-9 min-w-28 flex-[1_1_7rem] rounded-md bg-black/5 px-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-cyan-400 dark:bg-white/10 dark:text-gray-100 md:min-h-8"
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
							<option
								key={shape}
								value={shape}
								className="text-black"
							>
								{SHAPE_LABEL[shape]}
							</option>
						))}
					</select>
				)}
			</div>
			{node.type === "note" && (
				<textarea
					// Remount when the text changes elsewhere (undo/redo, canvas edit).
					key={`${node.id}:description:${description}`}
					aria-label="Node description"
					placeholder="Description"
					defaultValue={description}
					maxLength={BOARD_TEXT_MAX}
					rows={selected ? 3 : 1}
					onFocus={() => actions.selectOnly([node.id])}
					onBlur={(event) => commitDescription(event.target.value)}
					onKeyDown={(event) => {
						// Enter is a new line here. Escape puts back the saved text.
						if (event.key === "Escape") {
							event.currentTarget.value = description;
							event.currentTarget.blur();
						}
					}}
					className="mt-1 block w-full resize-none rounded-md bg-black/5 px-2 py-1.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-cyan-400 dark:bg-white/10 dark:text-gray-100"
				/>
			)}
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
				<RowLinks
					nodeId={node.id}
					showLinks={showLinks}
					canPickLink={canPickLink}
					linkable={linkable}
					linkedTo={linkedTo}
					actions={actions}
				/>
			</div>
		</li>
	);
};

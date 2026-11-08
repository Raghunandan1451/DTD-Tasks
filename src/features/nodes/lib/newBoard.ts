import { newId } from "@src/lib/db/newId";
import type { Board, BoardLayoutMode, BoardNode } from "@src/lib/db/types";
import { DEFAULT_NODE_SIZE } from "@src/features/nodes/lib/constants";
import { DEFAULT_BOARD_COLOR } from "@src/features/nodes/lib/palette";

/** A blank shape node. Its saved position is only used by free boards. */
export const makeShapeNode = (): BoardNode => ({
	id: newId(),
	type: "shape",
	position: { x: 0, y: 0 },
	width: DEFAULT_NODE_SIZE.shape.width,
	height: DEFAULT_NODE_SIZE.shape.height,
	data: { color: DEFAULT_BOARD_COLOR, shape: "rounded" },
});

/** What a new board of this type starts with. Grid boards begin as 1 row x 1 column. */
export const initialContent = (
	mode: BoardLayoutMode,
): Partial<Pick<Board, "nodes" | "edges" | "gridColumns">> =>
	mode === "grid" ? { nodes: [makeShapeNode()], edges: [], gridColumns: 1 } : {};

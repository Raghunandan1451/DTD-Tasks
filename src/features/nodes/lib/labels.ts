import type { BoardLayoutMode, BoardShape } from "@src/lib/db/types";

export const BOARD_TYPE_LABEL: Record<BoardLayoutMode, string> = {
	free: "Free",
	tree: "Tree",
	graph: "Graph",
	grid: "Grid",
};

export const SHAPE_LABEL: Record<BoardShape, string> = {
	rect: "Rectangle",
	rounded: "Rounded",
	ellipse: "Ellipse",
	diamond: "Diamond",
};

import type { Node } from "@xyflow/react";
import type { GridHeader } from "@src/features/nodes/lib/layout";

export type GridHeaderData = {
	axis: "row" | "column" | "corner";
	index: number;
	label: string;
};

/** Not a stored node: the canvas adds these on grid boards to show row and column names. */
export type GridHeaderNode = Node<GridHeaderData, "gridHeader">;

export const GRID_HEADER_TYPE = "gridHeader";

/**
 * The on-screen node for a header cell. React Flow turns pointer events off for a
 * node that is neither selectable nor draggable, which would block the rename
 * double-click, so they are switched back on here (a node's `style` wins).
 */
export const toGridHeaderNode = (header: GridHeader): GridHeaderNode => ({
	id: header.id,
	type: GRID_HEADER_TYPE,
	position: { x: header.x, y: header.y },
	width: header.width,
	height: header.height,
	data: { axis: header.axis, index: header.index, label: header.label },
	style: { pointerEvents: "all" },
	draggable: false,
	selectable: false,
	connectable: false,
	deletable: false,
	focusable: false,
});

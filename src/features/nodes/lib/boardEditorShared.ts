import { MarkerType, type Viewport } from "@xyflow/react";
import { newId } from "@src/lib/db/newId";
import type { BoardLayoutMode } from "@src/lib/db/types";
import { EDGE_TYPE_LABELED, GRID_SIZE } from "@src/features/nodes/lib/constants";
import type { FlowEdge, FlowNode } from "@src/features/nodes/lib/serialize";

/** A change to the nodes and edges, applied as one undoable step. */
export type MutateChange = (
	nodes: FlowNode[],
	edges: FlowEdge[],
) => { nodes?: FlowNode[]; edges?: FlowEdge[] };

export type Mutate = (change: MutateChange) => void;

export interface EdgePatch {
	label?: string;
	arrow?: boolean;
}

export interface LayoutMeta {
	layoutMode: BoardLayoutMode;
	/** Outline editor text, kept even while it has errors. */
	outline: string;
	treeRootId: string | null;
	/** Grid boards: how many columns the node list is cut into. */
	gridColumns: number;
	/** Grid boards: names by row / column index. Empty means no names. */
	gridRowLabels: string[];
	gridColumnLabels: string[];
	/** Grid boards: title of the corner cell. */
	gridCornerLabel: string;
}

export const makeEdge = (source: string, target: string): FlowEdge => ({
	id: newId(),
	source,
	target,
	type: EDGE_TYPE_LABELED,
	markerEnd: { type: MarkerType.ArrowClosed },
});

export const snap = (value: number): number => Math.round(value / GRID_SIZE) * GRID_SIZE;

export const sameViewport = (a: Viewport, b: Viewport): boolean =>
	a.x === b.x && a.y === b.y && a.zoom === b.zoom;

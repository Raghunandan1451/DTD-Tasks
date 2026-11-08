export interface LayoutNode {
	id: string;
	width: number;
	height: number;
}

export interface LayoutEdge {
	id: string;
	source: string;
	target: string;
}

export interface Point {
	x: number;
	y: number;
}

export type Positions = Record<string, Point>;

export interface LayoutOptions {
	/** Space between neighbouring nodes. */
	gapX?: number;
	gapY?: number;
}

export const DEFAULT_GAP_X = 48;
export const DEFAULT_GAP_Y = 64;

export const maxSize = (nodes: readonly LayoutNode[]): { width: number; height: number } => ({
	width: nodes.reduce((m, n) => Math.max(m, n.width), 0),
	height: nodes.reduce((m, n) => Math.max(m, n.height), 0),
});

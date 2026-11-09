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

export interface Size {
	width: number;
	height: number;
}

/** Grid boards are tables: tight cells, with a header strip for names. */
export const DEFAULT_TABLE_GAP = 8;
export const COLUMN_HEADER_HEIGHT = 32;
export const ROW_HEADER_WIDTH = 120;

/** A column name, row name, or the corner cell. Laid out, never stored as a node. */
export interface GridHeader {
	id: string;
	axis: "column" | "row" | "corner";
	index: number;
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface GridLayout {
	positions: Positions;
	/** Each node's size in the table: its column's width by its row's height. */
	sizes: Record<string, Size>;
	headers: GridHeader[];
}

export const maxSize =(nodes: readonly LayoutNode[]): { width: number; height: number } => ({
	width: nodes.reduce((m, n) => Math.max(m, n.width), 0),
	height: nodes.reduce((m, n) => Math.max(m, n.height), 0),
});

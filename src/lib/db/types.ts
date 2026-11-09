export type JournalMood = 1 | 2 | 3 | 4 | 5;

export const JOURNAL_TEXT_MAX = 1000;

export interface JournalEntry {
	id: string;
	/** Max JOURNAL_TEXT_MAX characters. */
	text: string;
	mood?: JournalMood;
	tags?: string[];
	/** Key into the `journalImages` store. */
	imageId?: string;
	/** Epoch ms. Immutable and always "now" when the note is created. */
	createdAt: number;
	updatedAt?: number;
}

export interface JournalImage {
	id: string;
	blob: Blob;
}

export type MarkdownAction = "created" | "edited" | "renamed" | "deleted";

/** Metadata only: file content is never logged. */
export interface MarkdownLogEntry {
	id: string;
	fileId: string;
	/** Full path/name at the time of the event. */
	name: string;
	action: MarkdownAction;
	/** Local calendar day, YYYY-MM-DD. */
	day: string;
	createdAt: number;
	updatedAt: number;
	meta?: { oldName?: string; isFolder?: boolean };
}

// --- Nodes & Notes boards ---------------------------------------------------

export const BOARD_TEXT_MAX = 2000;

export const BOARD_NODE_TYPES = ["note", "shape", "text"] as const;
export type BoardNodeType = (typeof BOARD_NODE_TYPES)[number];

export const BOARD_SHAPES = ["rect", "rounded", "ellipse", "diamond"] as const;
export type BoardShape = (typeof BOARD_SHAPES)[number];

/** Key into the fixed colour palette, never a raw hex value. */
export const BOARD_COLORS = [
	"slate",
	"cyan",
	"emerald",
	"amber",
	"rose",
	"violet",
] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

export interface BoardNodeData {
	title?: string;
	/** Max BOARD_TEXT_MAX characters. */
	text?: string;
	color: BoardColor;
	shape?: BoardShape;
}

/** Serializable fields only: React Flow runtime state is never stored. */
export interface BoardNode {
	id: string;
	type: BoardNodeType;
	position: { x: number; y: number };
	width?: number;
	height?: number;
	data: BoardNodeData;
}

export interface BoardEdge {
	id: string;
	source: string;
	target: string;
	label?: string;
	arrow?: boolean;
}

export interface BoardViewport {
	x: number;
	y: number;
	zoom: number;
}

export const BOARD_LAYOUT_MODES = ["free", "tree", "graph", "grid"] as const;
export type BoardLayoutMode = (typeof BOARD_LAYOUT_MODES)[number];

/** One record per board, so a large board never forces rewriting the others. */
export interface Board {
	id: string;
	name: string;
	nodes: BoardNode[];
	edges: BoardEdge[];
	viewport: BoardViewport;
	/**
	 * How positions are shown. Missing means "free". Only "free" uses the saved
	 * node positions; the other modes compute positions on render.
	 */
	layoutMode?: BoardLayoutMode;
	/** The outline editor's text, kept even when it has errors. */
	outline?: string;
	/** Root node for the "tree" layout. */
	treeRootId?: string;
	/** Columns of a "grid" board; rows are the node count divided by this. Missing means a square-ish grid. */
	gridColumns?: number;
	/**
	 * Names of a "grid" board's rows and columns, by index. May be shorter than
	 * the real count (a missing name is blank); absent means no names.
	 */
	gridRowLabels?: string[];
	gridColumnLabels?: string[];
	/** Title of a "grid" board's top-left corner cell, e.g. "Days x Exercise". */
	gridCornerLabel?: string;
	/** Epoch ms. */
	createdAt: number;
	updatedAt: number;
}

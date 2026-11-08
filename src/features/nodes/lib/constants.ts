/** Wait this long after the last change before writing the board. */
export const AUTOSAVE_MS = 800;

/** Most undo steps kept; the oldest is dropped first. */
export const HISTORY_CAP = 50;

/** Snap-to-grid size in flow pixels. */
export const GRID_SIZE = 16;

/** How far a pasted or duplicated copy is shifted from the original. */
export const PASTE_OFFSET = 24;

/** Default size of a new node, in flow pixels. */
export const DEFAULT_NODE_SIZE = {
	note: { width: 220, height: 140 },
	shape: { width: 160, height: 100 },
	text: { width: 160, height: 40 },
} as const;

export const EDGE_TYPE_LABELED = "labeled";

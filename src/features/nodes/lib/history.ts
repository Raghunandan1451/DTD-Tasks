import type { BoardEdge, BoardNode } from "@src/lib/db/types";
import { HISTORY_CAP } from "@src/features/nodes/lib/constants";

/** A full copy of what is undoable: nodes and edges, as stored. */
export interface Snapshot {
	nodes: BoardNode[];
	edges: BoardEdge[];
	/** Grid boards only: columns change together with the nodes, so undo restores both. */
	gridColumns?: number;
}

export interface History {
	/** Oldest first; the last item is the state one undo goes back to. */
	past: Snapshot[];
	/** Most recently undone first. */
	future: Snapshot[];
}

export const createHistory = (): History => ({ past: [], future: [] });

export const canUndo = (history: History): boolean => history.past.length > 0;
export const canRedo = (history: History): boolean => history.future.length > 0;

export const snapshotsEqual = (a: Snapshot, b: Snapshot): boolean =>
	JSON.stringify(a) === JSON.stringify(b);

/**
 * Pushes the state from before a change. A new change drops the redo stack,
 * and the oldest step is discarded once the cap is reached.
 */
export const recordHistory = (
	history: History,
	before: Snapshot,
	cap: number = HISTORY_CAP,
): History => ({
	past: [...history.past, before].slice(-cap),
	future: [],
});

/**
 * Records one step for a change that happened between `before` and `after`,
 * or nothing if they are the same. A drag is many small moves; the editor keeps
 * the snapshot from drag start and calls this once on drag stop, so the whole
 * drag is a single undo step.
 */
export const commitChange = (
	history: History,
	before: Snapshot,
	after: Snapshot,
	cap: number = HISTORY_CAP,
): History => (snapshotsEqual(before, after) ? history : recordHistory(history, before, cap));

export interface HistoryStep {
	history: History;
	/** The state to show now. */
	snapshot: Snapshot;
}

export const undo = (
	history: History,
	current: Snapshot,
	cap: number = HISTORY_CAP,
): HistoryStep | null => {
	const snapshot = history.past[history.past.length - 1];
	if (!snapshot) return null;
	return {
		snapshot,
		history: {
			past: history.past.slice(0, -1),
			future: [current, ...history.future].slice(0, cap),
		},
	};
};

export const redo = (
	history: History,
	current: Snapshot,
	cap: number = HISTORY_CAP,
): HistoryStep | null => {
	const [snapshot, ...rest] = history.future;
	if (!snapshot) return null;
	return {
		snapshot,
		history: {
			past: [...history.past, current].slice(-cap),
			future: rest,
		},
	};
};

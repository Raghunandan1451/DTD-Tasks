import { newId } from "@src/lib/db/newId";
import type { Board } from "@src/lib/db/types";
import type { FileState } from "@src/features/markdown/type";
import {
	NOT_FOUND_MESSAGE,
	buildBoard,
	byRecentlyUpdated,
	copyOfBoard,
	defaultBoardName,
	renamedBoard,
	withBoardContent,
} from "@src/lib/storage/boardLogic";
import { diffNotesTree, type NotesOp } from "@src/lib/storage/notesDiff";
import type {
	BoardMergeResult,
	BoardsStore,
	NotesStore,
} from "@src/lib/storage/types";

/**
 * Storage that lives only in memory. Used by tests so notes and boards logic
 * runs without a browser database or a desktop shell. Stored data is copied on
 * the way in and out, like a real database, so callers cannot change it by accident.
 */

export interface MemoryNotesStore extends NotesStore {
	/** The file steps a disk store would have run, in order. */
	readonly ops: NotesOp[];
}

export const createMemoryNotesStore = (initial: FileState | null = null): MemoryNotesStore => {
	let saved: FileState | null = initial ? structuredClone(initial) : null;
	const ops: NotesOp[] = [];
	return {
		ops,
		loadTree: async () => (saved ? structuredClone(saved) : null),
		saveTree: async (state) => {
			ops.push(...diffNotesTree(saved?.files ?? [], state.files));
			saved = structuredClone(state);
		},
		flush: async () => {},
	};
};

export const createMemoryBoardsStore = (initial: Board[] = []): BoardsStore => {
	const boards = new Map<string, Board>();
	for (const board of initial) boards.set(board.id, structuredClone(board));
	let lastBoardId: string | null = null;

	const need = (id: string): Board => {
		const existing = boards.get(id);
		if (!existing) throw new Error(NOT_FOUND_MESSAGE);
		return existing;
	};

	return {
		listBoards: async () =>
			[...boards.values()].map((b) => structuredClone(b)).sort(byRecentlyUpdated),
		getBoard: async (id) => {
			const board = boards.get(id);
			return board ? structuredClone(board) : null;
		},
		countBoards: async () => boards.size,
		createBoard: async (name = defaultBoardName(), layoutMode = "free", initialContent = {}) => {
			const board = buildBoard(newId(), Date.now(), name, layoutMode, initialContent);
			boards.set(board.id, structuredClone(board));
			return board;
		},
		saveBoard: async (board) => {
			const next: Board = { ...board, updatedAt: Date.now() };
			boards.set(next.id, structuredClone(next));
			return next;
		},
		renameBoard: async (id, name) => {
			const next = renamedBoard(need(id), name, Date.now());
			boards.set(id, structuredClone(next));
			return next;
		},
		duplicateBoard: async (id) => {
			const copy = copyOfBoard(need(id), newId(), Date.now());
			boards.set(copy.id, structuredClone(copy));
			return copy;
		},
		deleteBoard: async (id) => {
			boards.delete(id);
		},
		mergeBoards: async (incoming) => {
			const result: BoardMergeResult = { added: 0, skipped: 0 };
			for (const board of incoming) {
				if (boards.has(board.id)) result.skipped++;
				else {
					boards.set(board.id, structuredClone(board));
					result.added++;
				}
			}
			return result;
		},
		getLastBoardId: async () => lastBoardId,
		setLastBoardId: async (id) => {
			lastBoardId = id;
		},
		saveBoardContent: async (id, content, options = {}) => {
			const existing = boards.get(id);
			if (!existing) return null;
			const next = withBoardContent(existing, content, Date.now(), options.touch !== false);
			boards.set(id, structuredClone(next));
			return next;
		},
	};
};

export const createMemoryStorage = (): { notes: MemoryNotesStore; boards: BoardsStore } => ({
	notes: createMemoryNotesStore(),
	boards: createMemoryBoardsStore(),
});

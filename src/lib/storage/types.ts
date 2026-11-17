import type { Board } from "@src/lib/db/types";
import type { FileState } from "@src/features/markdown/type";

export interface BoardMergeResult {
	added: number;
	skipped: number;
}

/** The part of a board the canvas edits. Name and dates belong to the board list. */
export type BoardContent = Pick<Board, "nodes" | "edges" | "viewport"> &
	Partial<
		Pick<
			Board,
			| "layoutMode"
			| "outline"
			| "treeRootId"
			| "gridColumns"
			| "gridRowLabels"
			| "gridColumnLabels"
			| "gridCornerLabel"
		>
	>;

/**
 * Where boards are kept. Names and behaviour mirror the original IndexedDB
 * functions so callers did not have to change how they use them.
 */
export interface BoardsStore {
	/** All boards, most recently updated first. */
	listBoards(): Promise<Board[]>;
	getBoard(id: string): Promise<Board | null>;
	countBoards(): Promise<number>;
	/** The type is chosen here and never changed afterwards. */
	createBoard(
		name?: string,
		layoutMode?: Board["layoutMode"],
		initial?: Partial<Pick<Board, "nodes" | "edges" | "gridColumns">>,
	): Promise<Board>;
	/** Writes the whole board record and stamps `updatedAt`. Returns what was stored. */
	saveBoard(board: Board): Promise<Board>;
	renameBoard(id: string, name: string): Promise<Board>;
	/** Copies a board under a new id, named "<name> (copy)". */
	duplicateBoard(id: string): Promise<Board>;
	deleteBoard(id: string): Promise<void>;
	/** Adds boards not already stored (matched by id); never touches existing ones. */
	mergeBoards(boards: Board[]): Promise<BoardMergeResult>;
	getLastBoardId(): Promise<string | null>;
	setLastBoardId(id: string): Promise<void>;
	/**
	 * Saves canvas content onto the stored board, keeping its name and createdAt.
	 * `touch: false` leaves `updatedAt` alone. Returns null, writing nothing,
	 * when the board no longer exists.
	 */
	saveBoardContent(
		id: string,
		content: BoardContent,
		options?: { touch?: boolean },
	): Promise<Board | null>;
}

/**
 * Where the notes tree is kept. The app always holds the whole tree in Redux;
 * the store decides how to persist it (one blob today, one file per note on disk).
 */
export interface NotesStore {
	/** The saved tree, or null when nothing was saved yet. */
	loadTree(): Promise<FileState | null>;
	/** Persists the tree as it is now. Resolves once it is safely written. */
	saveTree(state: FileState): Promise<void>;
	/** Finishes anything still queued inside the store. */
	flush(): Promise<void>;
}

export interface StorageProvider {
	notes: NotesStore;
	boards: BoardsStore;
}

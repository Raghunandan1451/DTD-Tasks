import type { Board, JournalEntry, MarkdownAction, MarkdownLogEntry } from "@src/lib/db/types";
import type { JournalInput } from "@src/lib/db/journalValidation";
import type { JournalPatch } from "@src/lib/db/journalLogic";
import type { MergeResult, TimelineData } from "@src/lib/db/timelineBackupRepo";
import type { ExpensesState } from "@src/lib/store/slices/expensesSlice";
import type { FinanceState } from "@src/features/finance/type";
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
export interface NotesRefresh {
	/** The tree as it is on disk now. */
	state: FileState;
	/** Names of copies written because a note changed in the app and on disk. */
	conflicts: string[];
}

export interface NotesStore {
	/** The saved tree, or null when nothing was saved yet. */
	loadTree(): Promise<FileState | null>;
	/** Persists the tree as it is now. Resolves once it is safely written. */
	saveTree(state: FileState): Promise<void>;
	/** Finishes anything still queued inside the store. */
	flush(): Promise<void>;
	/**
	 * Folder stores only: notice changes made outside the app. Returns the new
	 * tree, or null when nothing changed.
	 */
	refresh?(current: FileState): Promise<NotesRefresh | null>;
}

/** Where journal notes and their images are kept. */
export interface JournalStore {
	/** Creates a note dated "now". There is deliberately no way to pass a date. */
	add(input: JournalInput): Promise<JournalEntry>;
	/** Edits text, mood and tags only; createdAt and the image never change. */
	update(id: string, patch: JournalPatch): Promise<JournalEntry>;
	/** Deletes the note and its image together. */
	remove(id: string): Promise<void>;
	/** Notes with fromMs <= createdAt < toMs, newest first. */
	inRange(fromMs: number, toMs: number): Promise<JournalEntry[]>;
	/** Notes written on the same calendar date in earlier years, newest first. */
	onThisDay(reference: Date): Promise<JournalEntry[]>;
	/** createdAt of the newest note strictly before beforeMs, or null. */
	timeBefore(beforeMs: number): Promise<number | null>;
	/** Stores an already-resized image and returns its id. */
	putImage(blob: Blob): Promise<string>;
	getImage(id: string): Promise<Blob | null>;
	deleteImage(id: string): Promise<void>;
}

/** Where the notes activity log (what the Home timeline shows for notes) is kept. */
export interface ActivityStore {
	/** Records one event; [fileId, day, action] is unique (see activityLogic). */
	log(
		fileId: string,
		name: string,
		action: MarkdownAction,
		meta: MarkdownLogEntry["meta"] | undefined,
		now: number,
	): Promise<void>;
	/** Rows with fromDay <= day <= toDay (YYYY-MM-DD, inclusive). */
	inRange(fromDay: string, toDay: string): Promise<MarkdownLogEntry[]>;
	/** The newest log day strictly before beforeDay, or null. */
	dayBefore(beforeDay: string): Promise<string | null>;
}

/** Adds the rows of a timeline backup (journal notes, images, activity) that are not stored yet. */
export interface TimelineStore {
	restore(data: TimelineData): Promise<MergeResult>;
}

/** Where the two finance slices are kept. */
export interface FinanceStore {
	loadFinance(): Promise<FinanceState | null>;
	saveFinance(state: FinanceState): Promise<void>;
	loadExpenses(): Promise<ExpensesState | null>;
	saveExpenses(state: ExpensesState): Promise<void>;
}

export interface StorageProvider {
	notes: NotesStore;
	boards: BoardsStore;
	journal: JournalStore;
	activity: ActivityStore;
	finance: FinanceStore;
	timeline: TimelineStore;
}

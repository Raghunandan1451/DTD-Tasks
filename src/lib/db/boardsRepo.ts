import {
	getDB,
	getValue,
	setValue,
	withErrorStatus,
} from "@src/lib/db/database";
import { newId } from "@src/lib/db/newId";
import type { Board, BoardLayoutMode } from "@src/lib/db/types";
import {
	NOT_FOUND_MESSAGE,
	buildBoard,
	copyOfBoard,
	defaultBoardName,
	renamedBoard,
	withBoardContent,
} from "@src/lib/storage/boardLogic";
import type { BoardContent, BoardMergeResult } from "@src/lib/storage/types";

const LAST_BOARD_KEY = "nodes_last_board_id";

/** All boards, most recently updated first. */
export const listBoards = async (): Promise<Board[]> => {
	const db = await getDB();
	const boards = await db.getAllFromIndex("boards", "updatedAt");
	return boards.reverse();
};

export const getBoard = async (id: string): Promise<Board | null> => {
	const db = await getDB();
	return (await db.get("boards", id)) ?? null;
};

export const countBoards = async (): Promise<number> => {
	const db = await getDB();
	return db.count("boards");
};

/** Creates a board of the given type. The type is chosen here and never changed afterwards. */
export const createBoard = (
	name: string = defaultBoardName(),
	layoutMode: BoardLayoutMode = "free",
	initial: Partial<Pick<Board, "nodes" | "edges" | "gridColumns">> = {},
): Promise<Board> =>
	withErrorStatus(async () => {
		const board = buildBoard(
			newId(),
			Date.now(),
			name,
			layoutMode,
			initial,
		);
		const db = await getDB();
		await db.add("boards", board);
		return board;
	});

/** Writes the whole board record and stamps `updatedAt`. Returns what was stored. */
export const saveBoard = (board: Board): Promise<Board> =>
	withErrorStatus(async () => {
		const next: Board = { ...board, updatedAt: Date.now() };
		const db = await getDB();
		await db.put("boards", next);
		return next;
	});

export const renameBoard = (id: string, name: string): Promise<Board> =>
	withErrorStatus(async () => {
		const db = await getDB();
		const tx = db.transaction("boards", "readwrite");
		const existing = await tx.store.get(id);
		if (!existing) throw new Error(NOT_FOUND_MESSAGE);
		const next = renamedBoard(existing, name, Date.now());
		await tx.store.put(next);
		await tx.done;
		return next;
	});

/** Copies a board under a new id, named "<name> (copy)". */
export const duplicateBoard = (id: string): Promise<Board> =>
	withErrorStatus(async () => {
		const db = await getDB();
		const tx = db.transaction("boards", "readwrite");
		const existing = await tx.store.get(id);
		if (!existing) throw new Error(NOT_FOUND_MESSAGE);
		const copy = copyOfBoard(existing, newId(), Date.now());
		await tx.store.add(copy);
		await tx.done;
		return copy;
	});

export const deleteBoard = (id: string): Promise<void> =>
	withErrorStatus(async () => {
		const db = await getDB();
		await db.delete("boards", id);
	});

/**
 * Adds boards that are not already stored. Existing boards are never touched
 * (matched by id). One transaction, so a failure adds nothing.
 */
export const mergeBoards = (boards: Board[]): Promise<BoardMergeResult> =>
	withErrorStatus(async () => {
		const db = await getDB();
		const tx = db.transaction("boards", "readwrite");
		const result: BoardMergeResult = { added: 0, skipped: 0 };

		try {
			for (const board of boards) {
				if (await tx.store.get(board.id)) result.skipped++;
				else {
					await tx.store.add(board);
					result.added++;
				}
			}
		} catch (error) {
			// A throw inside the loop does not abort the transaction by itself: without
			// this, the boards added so far would still be committed.
			tx.done.catch(() => {});
			try {
				tx.abort();
			} catch {
				// Already finished.
			}
			throw error;
		}

		await tx.done;
		return result;
	});

export const getLastBoardId = (): Promise<string | null> =>
	getValue<string>(LAST_BOARD_KEY);

export const setLastBoardId = (id: string): Promise<void> =>
	setValue(LAST_BOARD_KEY, id);

/**
 * Saves canvas content onto the stored board, keeping its current name and
 * createdAt (so a rename made while the canvas is open is never overwritten).
 * `touch: false` leaves `updatedAt` alone, for viewport-only changes. Returns
 * null, writing nothing, when the board was deleted in the meantime.
 */
export const saveBoardContent = (
	id: string,
	content: BoardContent,
	options: { touch?: boolean } = {},
): Promise<Board | null> =>
	withErrorStatus(async () => {
		const db = await getDB();
		const tx = db.transaction("boards", "readwrite");
		const existing = await tx.store.get(id);
		if (!existing) {
			await tx.done;
			return null;
		}
		const next = withBoardContent(
			existing,
			content,
			Date.now(),
			options.touch !== false,
		);
		await tx.store.put(next);
		await tx.done;
		return next;
	});

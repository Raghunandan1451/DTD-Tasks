import { getDB, getValue, setValue, withErrorStatus } from "@src/lib/db/database";
import { newId } from "@src/lib/db/newId";
import type { Board, BoardLayoutMode, BoardViewport } from "@src/lib/db/types";

const LAST_BOARD_KEY = "nodes_last_board_id";
const DEFAULT_BOARD_NAME = "Untitled board";
const DEFAULT_VIEWPORT: BoardViewport = { x: 0, y: 0, zoom: 1 };

const NOT_FOUND_MESSAGE = "That board no longer exists.";

export interface BoardMergeResult {
	added: number;
	skipped: number;
}

const cleanName = (name: string): string => name.trim() || DEFAULT_BOARD_NAME;

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
	name: string = DEFAULT_BOARD_NAME,
	layoutMode: BoardLayoutMode = "free",
	initial: Partial<Pick<Board, "nodes" | "edges" | "gridColumns">> = {},
): Promise<Board> =>
	withErrorStatus(async () => {
		const now = Date.now();
		const board: Board = {
			id: newId(),
			name: cleanName(name),
			nodes: initial.nodes ?? [],
			edges: initial.edges ?? [],
			viewport: { ...DEFAULT_VIEWPORT },
			layoutMode,
			...(initial.gridColumns ? { gridColumns: initial.gridColumns } : {}),
			createdAt: now,
			updatedAt: now,
		};
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
		const next: Board = {
			...existing,
			name: cleanName(name),
			updatedAt: Date.now(),
		};
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
		const now = Date.now();
		const copy: Board = {
			...structuredClone(existing),
			id: newId(),
			name: `${existing.name} (copy)`,
			createdAt: now,
			updatedAt: now,
		};
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

export const getLastBoardId = (): Promise<string | null> => getValue<string>(LAST_BOARD_KEY);

export const setLastBoardId = (id: string): Promise<void> => setValue(LAST_BOARD_KEY, id);

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
		const next: Board = {
			...existing,
			nodes: content.nodes,
			edges: content.edges,
			viewport: content.viewport,
			updatedAt: options.touch === false ? existing.updatedAt : Date.now(),
		};
		// An absent key clears the field, so removing the tree root really removes it.
		delete next.layoutMode;
		delete next.outline;
		delete next.treeRootId;
		delete next.gridColumns;
		delete next.gridRowLabels;
		delete next.gridColumnLabels;
		delete next.gridCornerLabel;
		if (content.layoutMode) next.layoutMode = content.layoutMode;
		if (content.outline) next.outline = content.outline;
		if (content.treeRootId) next.treeRootId = content.treeRootId;
		if (content.gridColumns) next.gridColumns = content.gridColumns;
		if (content.gridRowLabels?.length) next.gridRowLabels = content.gridRowLabels;
		if (content.gridColumnLabels?.length) next.gridColumnLabels = content.gridColumnLabels;
		if (content.gridCornerLabel) next.gridCornerLabel = content.gridCornerLabel;
		await tx.store.put(next);
		await tx.done;
		return next;
	});

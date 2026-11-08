import { useCallback, useEffect, useRef, useState } from "react";
import {
	createBoard,
	deleteBoard,
	duplicateBoard,
	getBoard,
	getLastBoardId,
	listBoards,
	renameBoard,
	setLastBoardId,
} from "@src/lib/db/boardsRepo";
import type { Board, BoardLayoutMode } from "@src/lib/db/types";
import { initialContent } from "@src/features/nodes/lib/newBoard";

type Notify = (message: string, type?: "info" | "error" | "success") => void;

/** What the board list needs. The full record is only loaded for the open board. */
export interface BoardSummary {
	id: string;
	name: string;
	updatedAt: number;
	nodeCount: number;
	layoutMode: BoardLayoutMode;
}

const summarize = (board: Board): BoardSummary => ({
	id: board.id,
	name: board.name,
	layoutMode: board.layoutMode ?? "free",
	updatedAt: board.updatedAt,
	nodeCount: board.nodes.length,
});

const byNewest = (a: BoardSummary, b: BoardSummary): number => b.updatedAt - a.updatedAt;

const messageOf = (error: unknown, fallback: string): string =>
	error instanceof Error && error.message ? error.message : fallback;

/**
 * Board list plus the open board. `active` is the record as it was loaded: the
 * canvas takes it as its starting point and owns the content from then on, so
 * key the canvas by `active.id`. Renames and other list changes never touch it.
 */
export const useBoards = (notify?: Notify) => {
	const [boards, setBoards] = useState<BoardSummary[]>([]);
	const [active, setActive] = useState<Board | null>(null);
	const [loading, setLoading] = useState(true);

	const notifyRef = useRef(notify);
	useEffect(() => {
		notifyRef.current = notify;
	});

	// Latest list and open id for `remove`, which must not close over stale state.
	const boardsRef = useRef(boards);
	const activeIdRef = useRef<string | null>(null);
	useEffect(() => {
		boardsRef.current = boards;
		activeIdRef.current = active?.id ?? null;
	});

	const flushRef = useRef<(() => Promise<void>) | null>(null);
	const startedRef = useRef(false);

	/** The open canvas registers its autosave flush here (and null on unmount). */
	const registerFlush = useCallback((flush: (() => Promise<void>) | null) => {
		flushRef.current = flush;
	}, []);

	/** Writes any pending canvas edits, so reads below see them. */
	const flushPending = useCallback(async () => {
		await flushRef.current?.();
	}, []);

	const fail = useCallback((error: unknown, fallback: string) => {
		notifyRef.current?.(messageOf(error, fallback), "error");
	}, []);

	const show = useCallback(async (board: Board) => {
		setActive(board);
		try {
			await setLastBoardId(board.id);
		} catch {
			// Remembering the last board is a convenience; the banner shows storage errors.
		}
	}, []);

	const open = useCallback(
		async (id: string) => {
			try {
				await flushPending();
				const board = await getBoard(id);
				if (!board) {
					notifyRef.current?.("That board no longer exists.", "error");
					setBoards((list) => list.filter((item) => item.id !== id));
					return;
				}
				await show(board);
			} catch (error) {
				fail(error, "Couldn't open that board");
			}
		},
		[fail, flushPending, show],
	);

	const create = useCallback(
		async (name?: string, layoutMode?: BoardLayoutMode) => {
			try {
				await flushPending();
				const board = await createBoard(name, layoutMode, initialContent(layoutMode ?? "free"));
				setBoards((list) => [summarize(board), ...list]);
				await show(board);
			} catch (error) {
				fail(error, "Couldn't create the board");
			}
		},
		[fail, flushPending, show],
	);

	const rename = useCallback(
		async (id: string, name: string) => {
			try {
				const board = await renameBoard(id, name);
				setBoards((list) =>
					list.map((item) => (item.id === id ? summarize(board) : item)).sort(byNewest),
				);
			} catch (error) {
				fail(error, "Couldn't rename the board");
			}
		},
		[fail],
	);

	const duplicate = useCallback(
		async (id: string) => {
			try {
				// Copy what is on screen, not what was last saved.
				await flushPending();
				const copy = await duplicateBoard(id);
				setBoards((list) => [summarize(copy), ...list]);
				await show(copy);
			} catch (error) {
				fail(error, "Couldn't duplicate the board");
			}
		},
		[fail, flushPending, show],
	);

	const remove = useCallback(
		async (id: string) => {
			try {
				await deleteBoard(id);
			} catch (error) {
				fail(error, "Couldn't delete the board");
				return;
			}
			const rest = boardsRef.current.filter((item) => item.id !== id);
			setBoards(rest);

			if (activeIdRef.current !== id) return;
			if (rest.length > 0) {
				await open(rest[0].id);
			} else {
				// No board is made for you: the page shows an empty state instead.
				setActive(null);
			}
		},
		[fail, open],
	);

	/** Reloads the list, e.g. after an import added boards. */
	const refresh = useCallback(async () => {
		try {
			const all = await listBoards();
			setBoards(all.map(summarize));
			// With nothing open (e.g. after deleting the last board), an import opens its first board.
			if (!activeIdRef.current && all[0]) await show(all[0]);
		} catch (error) {
			fail(error, "Couldn't reload your boards");
		}
	}, [fail, show]);

	/** Called after the canvas saves: keeps the list's date, count and order current. */
	const noteSaved = useCallback((board: Board) => {
		setBoards((list) =>
			list.map((item) => (item.id === board.id ? summarize(board) : item)).sort(byNewest),
		);
	}, []);

	// First load: list, then reopen the last board (or the newest, or make one).
	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;

		(async () => {
			try {
				const all = await listBoards();
				setBoards(all.map(summarize));

				const lastId = await getLastBoardId();
				const first = all.find((board) => board.id === lastId) ?? all[0];
				// No board is made for you when there are none: the page shows an empty state.
				if (first) await show(first);
			} catch (error) {
				fail(error, "Couldn't load your boards");
			} finally {
				setLoading(false);
			}
		})();
	}, [fail, show]);

	return {
		boards,
		active,
		activeId: active?.id ?? null,
		loading,
		open,
		create,
		rename,
		duplicate,
		remove,
		refresh,
		noteSaved,
		registerFlush,
		flushPending,
	};
};

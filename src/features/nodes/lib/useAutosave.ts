import { useCallback, useEffect, useRef, useState } from "react";
import { saveBoardContent, type BoardContent } from "@src/lib/db/boardsRepo";
import type { Board } from "@src/lib/db/types";
import { AUTOSAVE_MS } from "@src/features/nodes/lib/constants";

export type SaveStatus = "saved" | "saving" | "error";

/** What changed: viewport-only changes do not bump the board's "last updated". */
export type DirtyKind = "content" | "viewport";

interface UseAutosaveOptions {
	boardId: string;
	/** Reads the current canvas content at save time. */
	getContent: () => BoardContent;
	/** Called with the stored board after each successful save. */
	onSaved?: (board: Board) => void;
	onError?: (message: string) => void;
}

/**
 * Debounced save of one board. A change restarts an 800ms timer; the board is
 * also written when the tab is hidden or closing, and when the canvas unmounts
 * (for example when switching boards). Saves run one after another so an older
 * write can never land after a newer one.
 */
export const useAutosave = ({ boardId, getContent, onSaved, onError }: UseAutosaveOptions) => {
	const [status, setStatus] = useState<SaveStatus>("saved");

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dirtyRef = useRef({ content: false, viewport: false });
	const queueRef = useRef<Promise<void>>(Promise.resolve());

	// Latest callbacks, so the effects below subscribe once.
	const getContentRef = useRef(getContent);
	const onSavedRef = useRef(onSaved);
	const onErrorRef = useRef(onError);
	useEffect(() => {
		getContentRef.current = getContent;
		onSavedRef.current = onSaved;
		onErrorRef.current = onError;
	});

	const flush = useCallback((): Promise<void> => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		const dirty = dirtyRef.current;
		if (dirty.content || dirty.viewport) {
			dirtyRef.current = { content: false, viewport: false };
			const touch = dirty.content;
			const content = getContentRef.current();

			queueRef.current = queueRef.current.then(async () => {
				try {
					const saved = await saveBoardContent(boardId, content, { touch });
					if (saved) onSavedRef.current?.(saved);
					const stillDirty = dirtyRef.current.content || dirtyRef.current.viewport;
					setStatus(stillDirty ? "saving" : "saved");
				} catch (error) {
					// Keep the change so the next attempt retries it.
					dirtyRef.current = {
						content: dirtyRef.current.content || dirty.content,
						viewport: dirtyRef.current.viewport || dirty.viewport,
					};
					setStatus("error");
					onErrorRef.current?.(error instanceof Error ? error.message : "Couldn't save this board");
				}
			});
		}
		return queueRef.current;
	}, [boardId]);

	const markDirty = useCallback(
		(kind: DirtyKind) => {
			dirtyRef.current[kind] = true;
			setStatus("saving");
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				void flush();
			}, AUTOSAVE_MS);
		},
		[flush],
	);

	useEffect(() => {
		const onVisibility = () => {
			if (document.visibilityState === "hidden") void flush();
		};
		const onLeave = () => {
			void flush();
		};
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("pagehide", onLeave);
		window.addEventListener("beforeunload", onLeave);
		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("pagehide", onLeave);
			window.removeEventListener("beforeunload", onLeave);
			void flush();
		};
	}, [flush]);

	return { status, markDirty, flush };
};

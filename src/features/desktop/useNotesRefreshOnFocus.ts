import { useEffect } from "react";
import store from "@src/lib/store/store";
import { setFileState } from "@src/lib/store/slices/markdownSlice";
import { getNotesStore } from "@src/lib/storage";
import { flushPendingSaves } from "@src/lib/utils/persistMiddleware";

/**
 * Desktop only. When the window gets focus back, look for notes changed outside
 * the app (edited, added, renamed or deleted in the file explorer) and load them.
 * The app's own edits are saved first, so they are never overwritten; if a note
 * changed in both places, the app's text is kept in a "(conflict ...)" copy and
 * `onConflicts` is told.
 */
export const useNotesRefreshOnFocus = (
	enabled: boolean,
	onConflicts: (names: string[]) => void,
): void => {
	useEffect(() => {
		if (!enabled) return;
		let running = false;
		const check = async () => {
			if (running) return;
			running = true;
			try {
				const notes = getNotesStore();
				if (!notes.refresh) return;
				await flushPendingSaves();
				const before = store.getState().fileManager;
				const result = await notes.refresh(before);
				if (!result) return;
				// The user kept typing while we looked: try again on the next focus.
				if (store.getState().fileManager !== before) return;
				store.dispatch(setFileState(result.state));
				if (result.conflicts.length > 0) onConflicts(result.conflicts);
			} catch {
				/* a failed look is harmless; the next focus tries again */
			} finally {
				running = false;
			}
		};
		window.addEventListener("focus", check);
		return () => window.removeEventListener("focus", check);
	}, [enabled, onConflicts]);
};

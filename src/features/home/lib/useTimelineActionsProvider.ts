import { useMemo } from "react";
import { useDispatch, useStore } from "react-redux";
import type { TimelineActions } from "@src/features/home/lib/timelineActions";
import { useConfirmationModal } from "@src/lib/hooks/useConfirmDialog";
import { deleteJournalEntry, updateJournalEntry } from "@src/lib/db/journalRepo";
import { selectFile } from "@src/lib/store/slices/markdownSlice";
import { setSelectedDate } from "@src/lib/store/slices/expensesSlice";
import type { AppDispatch, RootState } from "@src/lib/store/store";
import { findPathById } from "@src/lib/utils/markdownIds";

type Notify = (message: string, type?: "info" | "error" | "success") => void;

const messageOf = (error: unknown, fallback: string): string =>
	error instanceof Error ? error.message : fallback;

/**
 * Builds the actions for the feed's rows. Editing and deleting reload the feed
 * afterwards; deleting asks first with the app's shared confirm dialog.
 */
export const useTimelineActionsProvider = (
	refresh: () => void,
	showNotification?: Notify,
) => {
	const dispatch = useDispatch<AppDispatch>();
	const store = useStore<RootState>();
	const dialog = useConfirmationModal();
	const { confirm } = dialog;

	const actions: TimelineActions = useMemo(
		() => ({
			openFile: (fileId) => {
				const path = findPathById(store.getState().fileManager.files, fileId);
				// A folder (or a file that vanished) just opens the Markdown page.
				if (path) dispatch(selectFile(path));
			},
			openExpenses: (day) => {
				dispatch(setSelectedDate(day));
			},
			saveNote: async (id, patch) => {
				await updateJournalEntry(id, patch);
				showNotification?.("Note updated", "success");
				refresh();
			},
			deleteNote: async (id) => {
				const confirmed = await confirm({
					title: "Delete note",
					message: "This note will be deleted for good. This cannot be undone.",
					confirmText: "Delete",
					type: "danger",
				});
				if (!confirmed) return;
				try {
					await deleteJournalEntry(id);
					showNotification?.("Note deleted", "success");
					refresh();
				} catch (error) {
					showNotification?.(messageOf(error, "Could not delete the note."), "error");
				}
			},
		}),
		[dispatch, store, confirm, refresh, showNotification],
	);

	return { actions, dialog };
};

import type { FolderActivityStore } from "@src/lib/storage/folder/folderActivityStore";
import type { FolderJournalStore } from "@src/lib/storage/folder/folderJournalStore";
import type { TimelineStore } from "@src/lib/storage/types";

/** Restores a timeline backup into the journal day files and the activity month files. */
export const createFolderTimelineStore = (
	journal: FolderJournalStore,
	activity: FolderActivityStore,
): TimelineStore => ({
	restore: async (data) => {
		const notes = await journal.restore(data.journal);
		const rows = await activity.restore(data.markdownLog);
		return {
			journalAdded: notes.entriesAdded,
			journalSkipped: notes.entriesSkipped,
			logAdded: rows.added,
			logSkipped: rows.skipped,
		};
	},
});

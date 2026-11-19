import { getDB } from "@src/lib/db/database";
import { getStorage } from "@src/lib/storage";
import type {
	JournalEntry,
	JournalImage,
	MarkdownLogEntry,
} from "@src/lib/db/types";

export interface TimelineData {
	journal: JournalEntry[];
	journalImages: JournalImage[];
	markdownLog: MarkdownLogEntry[];
}

export interface MergeResult {
	journalAdded: number;
	journalSkipped: number;
	imagesAdded: number;
	imagesSkipped: number;
	logAdded: number;
	logSkipped: number;
}

/** Everything the Timeline backup exports (expenses live in their own section). */
export const getAllTimelineData = async (): Promise<TimelineData> => {
	const db = await getDB();
	const tx = db.transaction(["journal", "journalImages", "markdownLog"]);
	const [journal, journalImages, markdownLog] = await Promise.all([
		tx.objectStore("journal").getAll(),
		tx.objectStore("journalImages").getAll(),
		tx.objectStore("markdownLog").getAll(),
	]);
	await tx.done;
	return { journal, journalImages, markdownLog };
};

/** Rows exported by Timeline: notes plus markdown activity. */
export const countTimelineData = async (): Promise<number> => {
	const db = await getDB();
	const [journal, markdownLog] = await Promise.all([
		db.count("journal"),
		db.count("markdownLog"),
	]);
	return journal + markdownLog;
};

/**
 * Adds backup rows that are not already stored. Existing rows are never
 * touched. Where they go (IndexedDB or the data folder) is the storage seam's decision.
 */
export const mergeTimelineData = (data: TimelineData): Promise<MergeResult> =>
	getStorage().timeline.restore(data);

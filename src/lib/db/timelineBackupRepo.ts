import {
	MARKDOWN_LOG_UNIQUE_INDEX,
	getDB,
	withErrorStatus,
} from "@src/lib/db/database";
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
 * touched: journal and images match by id, markdown log by id or by
 * [fileId, day, action]. One transaction, so a failure adds nothing.
 */
export const mergeTimelineData = (data: TimelineData): Promise<MergeResult> =>
	withErrorStatus(async () => {
		const db = await getDB();
		const tx = db.transaction(
			["journal", "journalImages", "markdownLog"],
			"readwrite",
		);
		const journal = tx.objectStore("journal");
		const images = tx.objectStore("journalImages");
		const log = tx.objectStore("markdownLog");
		const result: MergeResult = {
			journalAdded: 0,
			journalSkipped: 0,
			imagesAdded: 0,
			imagesSkipped: 0,
			logAdded: 0,
			logSkipped: 0,
		};

		for (const image of data.journalImages) {
			if (await images.get(image.id)) result.imagesSkipped++;
			else {
				await images.add(image);
				result.imagesAdded++;
			}
		}
		for (const entry of data.journal) {
			if (await journal.get(entry.id)) result.journalSkipped++;
			else {
				await journal.add(entry);
				result.journalAdded++;
			}
		}
		for (const row of data.markdownLog) {
			const duplicate =
				(await log.get(row.id)) ||
				(await log
					.index(MARKDOWN_LOG_UNIQUE_INDEX)
					.get([row.fileId, row.day, row.action]));
			if (duplicate) result.logSkipped++;
			else {
				await log.add(row);
				result.logAdded++;
			}
		}

		await tx.done;
		return result;
	});

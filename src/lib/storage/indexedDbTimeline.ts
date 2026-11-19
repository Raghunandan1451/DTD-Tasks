import {
	MARKDOWN_LOG_UNIQUE_INDEX,
	getDB,
	withErrorStatus,
} from "@src/lib/db/database";
import type { MergeResult, TimelineData } from "@src/lib/db/timelineBackupRepo";
import type { TimelineStore } from "@src/lib/storage/types";

/**
 * Adds backup rows that are not already stored. Existing rows are never
 * touched: journal and images match by id, markdown log by id or by
 * [fileId, day, action]. One transaction, so a failure adds nothing.
 */
const mergeTimelineData = (data: TimelineData): Promise<MergeResult> =>
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

export const indexedDbTimelineStore: TimelineStore = { restore: mergeTimelineData };

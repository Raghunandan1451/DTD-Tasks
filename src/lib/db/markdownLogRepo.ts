import { MARKDOWN_LOG_UNIQUE_INDEX, getDB } from "@src/lib/db/database";
import { newId } from "@src/lib/db/newId";
import type { MarkdownAction, MarkdownLogEntry } from "@src/lib/db/types";
import { toLocalDay } from "@src/lib/utils/isoDate";

type LogMeta = MarkdownLogEntry["meta"];

/**
 * The one way markdown activity is recorded. Stores metadata only and never
 * throws: a failed log write must not block or fail the save that triggered it.
 *
 * [fileId, day, action] is unique, so:
 * - 'edited' upserts and only bumps updatedAt (ten saves a day = one row);
 * - a second 'renamed' on the same day updates the row's name but keeps the
 *   first oldName, so the row still reads "original -> latest";
 * - 'created' and 'deleted' can only happen once per file, so they insert.
 */
export const logMarkdown = async (
	fileId: string,
	name: string,
	action: MarkdownAction,
	meta?: LogMeta,
	now: number = Date.now(),
): Promise<void> => {
	try {
		const db = await getDB();
		const tx = db.transaction("markdownLog", "readwrite");
		const day = toLocalDay(now);
		const existing = await tx.store
			.index(MARKDOWN_LOG_UNIQUE_INDEX)
			.get([fileId, day, action]);

		if (!existing) {
			await tx.store.add({
				id: newId(),
				fileId,
				name,
				action,
				day,
				createdAt: now,
				updatedAt: now,
				...(meta ? { meta } : {}),
			});
		} else if (action === "edited") {
			await tx.store.put({ ...existing, updatedAt: now });
		} else {
			await tx.store.put({
				...existing,
				name,
				updatedAt: now,
				meta: { ...meta, ...existing.meta },
			});
		}
		await tx.done;
	} catch (error) {
		console.warn("[markdownLog] Failed to record activity", error);
	}
};

/** Log rows with fromDay <= day <= toDay (YYYY-MM-DD, inclusive). */
export const getMarkdownLogInRange = async (
	fromDay: string,
	toDay: string,
): Promise<MarkdownLogEntry[]> => {
	const db = await getDB();
	return db.getAllFromIndex(
		"markdownLog",
		"day",
		IDBKeyRange.bound(fromDay, toDay),
	);
};

/** The newest log day strictly before beforeDay (YYYY-MM-DD), or null if there is none. */
export const getMarkdownLogDayBefore = async (
	beforeDay: string,
): Promise<string | null> => {
	const db = await getDB();
	const cursor = await db
		.transaction("markdownLog")
		.store.index("day")
		.openCursor(IDBKeyRange.upperBound(beforeDay, true), "prev");
	return cursor ? (cursor.key as string) : null;
};

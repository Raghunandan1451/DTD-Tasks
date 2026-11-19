import { getStorage } from "@src/lib/storage";
import type { MarkdownAction, MarkdownLogEntry } from "@src/lib/db/types";

type LogMeta = MarkdownLogEntry["meta"];

/**
 * The one way markdown activity is recorded. Stores metadata only and never
 * throws: a failed log write must not block or fail the save that triggered it.
 * (The upsert rules live with each store: [fileId, day, action] is unique.)
 */
export const logMarkdown = async (
	fileId: string,
	name: string,
	action: MarkdownAction,
	meta?: LogMeta,
	now: number = Date.now(),
): Promise<void> => {
	try {
		await getStorage().activity.log(fileId, name, action, meta, now);
	} catch (error) {
		console.warn("[markdownLog] Failed to record activity", error);
	}
};

/** Log rows with fromDay <= day <= toDay (YYYY-MM-DD, inclusive). */
export const getMarkdownLogInRange = (
	fromDay: string,
	toDay: string,
): Promise<MarkdownLogEntry[]> => getStorage().activity.inRange(fromDay, toDay);

/** The newest log day strictly before beforeDay (YYYY-MM-DD), or null if there is none. */
export const getMarkdownLogDayBefore = (beforeDay: string): Promise<string | null> =>
	getStorage().activity.dayBefore(beforeDay);

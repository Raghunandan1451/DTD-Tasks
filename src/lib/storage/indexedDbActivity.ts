import { MARKDOWN_LOG_UNIQUE_INDEX, getDB } from "@src/lib/db/database";
import { newId } from "@src/lib/db/newId";
import type { ActivityStore } from "@src/lib/storage/types";
import { toLocalDay } from "@src/lib/utils/isoDate";

/** The activity log as it has always been kept: IndexedDB, one row per [fileId, day, action]. */
export const indexedDbActivityStore: ActivityStore = {
	log: async (fileId, name, action, meta, now = Date.now()) => {
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
	},

	inRange: async (fromDay, toDay) => {
		const db = await getDB();
		return db.getAllFromIndex("markdownLog", "day", IDBKeyRange.bound(fromDay, toDay));
	},

	dayBefore: async (beforeDay) => {
		const db = await getDB();
		const cursor = await db
			.transaction("markdownLog")
			.store.index("day")
			.openCursor(IDBKeyRange.upperBound(beforeDay, true), "prev");
		return cursor ? (cursor.key as string) : null;
	},
};

import { getDB, withErrorStatus } from "@src/lib/db/database";
import {
	JOURNAL_NOT_FOUND_MESSAGE,
	buildJournalEntry,
	patchedJournalEntry,
} from "@src/lib/db/journalLogic";
import { newId } from "@src/lib/db/newId";
import type { JournalEntry } from "@src/lib/db/types";
import type { JournalStore } from "@src/lib/storage/types";

/** The journal as it has always been kept: notes and images in IndexedDB. */
export const indexedDbJournalStore: JournalStore = {
	add: (input) =>
		withErrorStatus(async () => {
			const entry = buildJournalEntry(input, newId(), Date.now());
			const db = await getDB();
			await db.add("journal", entry);
			return entry;
		}),

	update: (id, patch) =>
		withErrorStatus(async () => {
			const db = await getDB();
			const tx = db.transaction("journal", "readwrite");
			const existing = await tx.store.get(id);
			if (!existing) throw new Error(JOURNAL_NOT_FOUND_MESSAGE);
			const next = patchedJournalEntry(existing, patch, Date.now());
			await tx.store.put(next);
			await tx.done;
			return next;
		}),

	remove: (id) =>
		withErrorStatus(async () => {
			const db = await getDB();
			const tx = db.transaction(["journal", "journalImages"], "readwrite");
			const existing = await tx.objectStore("journal").get(id);
			if (existing?.imageId) {
				await tx.objectStore("journalImages").delete(existing.imageId);
			}
			await tx.objectStore("journal").delete(id);
			await tx.done;
		}),

	inRange: async (fromMs, toMs) => {
		const db = await getDB();
		const entries = await db.getAllFromIndex(
			"journal",
			"createdAt",
			IDBKeyRange.bound(fromMs, toMs, false, true),
		);
		return entries.reverse();
	},

	/**
	 * Notes written on the same calendar date (month + day) in earlier years,
	 * newest first. One indexed range query per year, so it never scans the store.
	 */
	onThisDay: async (reference = new Date()) => {
		const db = await getDB();
		const earliest = await db
			.transaction("journal")
			.store.index("createdAt")
			.openCursor();
		if (!earliest) return [];

		const month = reference.getMonth();
		const day = reference.getDate();
		const firstYear = new Date(earliest.key as number).getFullYear();
		const found: JournalEntry[] = [];

		for (let year = reference.getFullYear() - 1; year >= firstYear; year--) {
			const start = new Date(year, month, day);
			// Feb 29 rolls into March in non-leap years: skip those years.
			if (start.getMonth() !== month) continue;
			const end = new Date(year, month, day + 1);
			const entries = await db.getAllFromIndex(
				"journal",
				"createdAt",
				IDBKeyRange.bound(start.getTime(), end.getTime(), false, true),
			);
			found.push(...entries.reverse());
		}
		return found;
	},

	timeBefore: async (beforeMs) => {
		const db = await getDB();
		const cursor = await db
			.transaction("journal")
			.store.index("createdAt")
			.openCursor(IDBKeyRange.upperBound(beforeMs, true), "prev");
		return cursor ? (cursor.key as number) : null;
	},

	putImage: (blob) =>
		withErrorStatus(async () => {
			const db = await getDB();
			const id = newId();
			await db.put("journalImages", { id, blob });
			return id;
		}),

	getImage: async (id) => {
		const db = await getDB();
		return (await db.get("journalImages", id))?.blob ?? null;
	},

	deleteImage: (id) =>
		withErrorStatus(async () => {
			const db = await getDB();
			await db.delete("journalImages", id);
		}),
};

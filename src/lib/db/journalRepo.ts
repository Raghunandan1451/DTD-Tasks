import { getDB, withErrorStatus } from "@src/lib/db/database";
import {
	normalizeTags,
	validateMood,
	validateText,
	type JournalInput,
} from "@src/lib/db/journalValidation";
import { newId } from "@src/lib/db/newId";
import type { JournalEntry, JournalMood } from "@src/lib/db/types";

export interface JournalPatch {
	text?: string;
	/** null clears the mood. */
	mood?: JournalMood | null;
	tags?: string[];
}

const NOT_FOUND_MESSAGE = "That note no longer exists.";

/** Creates a note dated "now". There is deliberately no way to pass a date. */
export const addJournalEntry = (input: JournalInput): Promise<JournalEntry> =>
	withErrorStatus(async () => {
		const text = validateText(input.text, Boolean(input.imageId));
		const mood = validateMood(input.mood);
		const tags = input.tags ? normalizeTags(input.tags) : [];

		const entry: JournalEntry = {
			id: newId(),
			text,
			createdAt: Date.now(),
			...(mood ? { mood } : {}),
			...(tags.length ? { tags } : {}),
			...(input.imageId ? { imageId: input.imageId } : {}),
		};

		const db = await getDB();
		await db.add("journal", entry);
		return entry;
	});

/** Edits text, mood and tags only; createdAt and the image never change. */
export const updateJournalEntry = (
	id: string,
	patch: JournalPatch,
): Promise<JournalEntry> =>
	withErrorStatus(async () => {
		const db = await getDB();
		const tx = db.transaction("journal", "readwrite");
		const existing = await tx.store.get(id);
		if (!existing) throw new Error(NOT_FOUND_MESSAGE);

		const next: JournalEntry = { ...existing };

		if (patch.text !== undefined) {
			next.text = validateText(patch.text, Boolean(existing.imageId));
		}
		if (patch.mood !== undefined) {
			const mood = patch.mood === null ? undefined : validateMood(patch.mood);
			if (mood) next.mood = mood;
			else delete next.mood;
		}
		if (patch.tags !== undefined) {
			const tags = normalizeTags(patch.tags);
			if (tags.length) next.tags = tags;
			else delete next.tags;
		}
		next.updatedAt = Date.now();

		await tx.store.put(next);
		await tx.done;
		return next;
	});

/** Deletes the note and its image together. */
export const deleteJournalEntry = (id: string): Promise<void> =>
	withErrorStatus(async () => {
		const db = await getDB();
		const tx = db.transaction(["journal", "journalImages"], "readwrite");
		const existing = await tx.objectStore("journal").get(id);
		if (existing?.imageId) {
			await tx.objectStore("journalImages").delete(existing.imageId);
		}
		await tx.objectStore("journal").delete(id);
		await tx.done;
	});

/** Notes with fromMs <= createdAt < toMs, newest first. */
export const getJournalInRange = async (
	fromMs: number,
	toMs: number,
): Promise<JournalEntry[]> => {
	const db = await getDB();
	const entries = await db.getAllFromIndex(
		"journal",
		"createdAt",
		IDBKeyRange.bound(fromMs, toMs, false, true),
	);
	return entries.reverse();
};

/**
 * Notes written on the same calendar date (month + day) in earlier years,
 * newest first. One indexed range query per year, so it never scans the store.
 */
export const getJournalOnThisDay = async (
	reference: Date = new Date(),
): Promise<JournalEntry[]> => {
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
};

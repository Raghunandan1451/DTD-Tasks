import {
	normalizeTags,
	validateMood,
	validateText,
	type JournalInput,
} from "@src/lib/db/journalValidation";
import type { JournalEntry, JournalMood } from "@src/lib/db/types";

export interface JournalPatch {
	text?: string;
	/** null clears the mood. */
	mood?: JournalMood | null;
	tags?: string[];
}

export const JOURNAL_NOT_FOUND_MESSAGE = "That note no longer exists.";

/** A new note dated `now`. There is deliberately no way to pass a date. */
export const buildJournalEntry = (input: JournalInput, id: string, now: number): JournalEntry => {
	const text = validateText(input.text, Boolean(input.imageId));
	const mood = validateMood(input.mood);
	const tags = input.tags ? normalizeTags(input.tags) : [];
	return {
		id,
		text,
		createdAt: now,
		...(mood ? { mood } : {}),
		...(tags.length ? { tags } : {}),
		...(input.imageId ? { imageId: input.imageId } : {}),
	};
};

/** The note with text, mood and tags edited; createdAt and the image never change. */
export const patchedJournalEntry = (
	existing: JournalEntry,
	patch: JournalPatch,
	now: number,
): JournalEntry => {
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
	next.updatedAt = now;
	return next;
};

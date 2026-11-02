import {
	JOURNAL_TEXT_MAX,
	type JournalMood,
} from "@src/lib/db/types";

export interface JournalInput {
	text: string;
	mood?: JournalMood;
	tags?: string[];
	imageId?: string;
}

export const isJournalMood = (value: unknown): value is JournalMood =>
	value === 1 || value === 2 || value === 3 || value === 4 || value === 5;

/** Trims tags, drops empties and removes case-insensitive duplicates. */
export const normalizeTags = (tags: readonly string[]): string[] => {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const raw of tags) {
		const tag = raw.trim();
		const key = tag.toLowerCase();
		if (!tag || seen.has(key)) continue;
		seen.add(key);
		result.push(tag);
	}
	return result;
};

/** Throws a readable Error for a note that must not be stored. */
export const validateText = (text: string, hasImage: boolean): string => {
	const trimmed = text.trim();
	if (!trimmed && !hasImage) throw new Error("Write something before posting.");
	if (trimmed.length > JOURNAL_TEXT_MAX) {
		throw new Error(`Notes can be at most ${JOURNAL_TEXT_MAX} characters.`);
	}
	return trimmed;
};

export const validateMood = (mood: unknown): JournalMood | undefined => {
	if (mood === undefined) return undefined;
	if (!isJournalMood(mood)) throw new Error("Mood must be between 1 and 5.");
	return mood;
};

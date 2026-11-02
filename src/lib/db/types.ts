export type JournalMood = 1 | 2 | 3 | 4 | 5;

export const JOURNAL_TEXT_MAX = 1000;

export interface JournalEntry {
	id: string;
	/** Max JOURNAL_TEXT_MAX characters. */
	text: string;
	mood?: JournalMood;
	tags?: string[];
	/** Key into the `journalImages` store. */
	imageId?: string;
	/** Epoch ms. Immutable and always "now" when the note is created. */
	createdAt: number;
	updatedAt?: number;
}

export interface JournalImage {
	id: string;
	blob: Blob;
}

export type MarkdownAction = "created" | "edited" | "renamed" | "deleted";

/** Metadata only: file content is never logged. */
export interface MarkdownLogEntry {
	id: string;
	fileId: string;
	/** Full path/name at the time of the event. */
	name: string;
	action: MarkdownAction;
	/** Local calendar day, YYYY-MM-DD. */
	day: string;
	createdAt: number;
	updatedAt: number;
	meta?: { oldName?: string; isFolder?: boolean };
}

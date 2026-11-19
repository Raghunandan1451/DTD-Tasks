import { getStorage } from "@src/lib/storage";
import type { JournalInput } from "@src/lib/db/journalValidation";
import type { JournalPatch } from "@src/lib/db/journalLogic";
import type { JournalEntry } from "@src/lib/db/types";

export type { JournalPatch } from "@src/lib/db/journalLogic";

/**
 * The journal API the app uses. Where the notes are kept (IndexedDB in the
 * browser, day files in the data folder on desktop) is decided by the storage seam.
 */
const store = () => getStorage().journal;

/** Creates a note dated "now". There is deliberately no way to pass a date. */
export const addJournalEntry = (input: JournalInput): Promise<JournalEntry> =>
	store().add(input);

/** Edits text, mood and tags only; createdAt never changes. */
export const updateJournalEntry = (id: string, patch: JournalPatch): Promise<JournalEntry> =>
	store().update(id, patch);

/** Deletes the note. */
export const deleteJournalEntry = (id: string): Promise<void> => store().remove(id);

/** Notes with fromMs <= createdAt < toMs, newest first. */
export const getJournalInRange = (fromMs: number, toMs: number): Promise<JournalEntry[]> =>
	store().inRange(fromMs, toMs);

/** Notes written on the same calendar date in earlier years, newest first. */
export const getJournalOnThisDay = (reference: Date = new Date()): Promise<JournalEntry[]> =>
	store().onThisDay(reference);

/** createdAt of the newest note strictly before beforeMs, or null if there is none. */
export const getJournalTimeBefore = (beforeMs: number): Promise<number | null> =>
	store().timeBefore(beforeMs);

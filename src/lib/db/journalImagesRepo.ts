import { getStorage } from "@src/lib/storage";

/** Stores an already-resized image and returns its id. */
export const putJournalImage = (blob: Blob): Promise<string> =>
	getStorage().journal.putImage(blob);

export const getJournalImage = (id: string): Promise<Blob | null> =>
	getStorage().journal.getImage(id);

export const deleteJournalImage = (id: string): Promise<void> =>
	getStorage().journal.deleteImage(id);

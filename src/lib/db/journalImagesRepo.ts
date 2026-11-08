import { getDB, withErrorStatus } from "@src/lib/db/database";
import { newId } from "@src/lib/db/newId";

/** Stores an already-resized image and returns its id. */
export const putJournalImage = (blob: Blob): Promise<string> =>
	withErrorStatus(async () => {
		const db = await getDB();
		const id = newId();
		await db.put("journalImages", { id, blob });
		return id;
	});

export const getJournalImage = async (id: string): Promise<Blob | null> => {
	const db = await getDB();
	return (await db.get("journalImages", id))?.blob ?? null;
};

export const deleteJournalImage = (id: string): Promise<void> =>
	withErrorStatus(async () => {
		const db = await getDB();
		await db.delete("journalImages", id);
	});

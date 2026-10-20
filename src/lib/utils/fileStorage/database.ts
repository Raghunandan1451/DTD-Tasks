import { openDB } from "idb";

const DATABASE_NAME = "AIO-List";
const OBJECT_STORE_NAME = "data";

const getDatabase = () => openDB(DATABASE_NAME, 1, {
	upgrade(db) {
		if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
			db.createObjectStore(OBJECT_STORE_NAME);
		}
	},
});

export const saveToIndexedDB = async <T>(key: string, data: T): Promise<void> => {
	const db = await getDatabase();
	await db.put(OBJECT_STORE_NAME, data, key);
};

export const getFromIndexedDB = async <T>(key: string): Promise<T | null> => {
	const db = await getDatabase();
	return (await db.get(OBJECT_STORE_NAME, key)) ?? null;
};

export const deleteFromIndexedDB = async (key: string): Promise<void> => {
	const db = await getDatabase();
	await db.delete(OBJECT_STORE_NAME, key);
};

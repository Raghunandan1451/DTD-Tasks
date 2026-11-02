import { openDB, DBSchema, IDBPDatabase } from "idb";

export const DB_NAME = "AIO-List";
export const DB_VERSION = 2;

/** v1 stored the removed Events page under this key. */
export const LEGACY_CALENDAR_KEY = "redux_calendar_data";
/** v2 parks old events here until the user downloads or skips them. */
export const LEGACY_EVENTS_PENDING_KEY = "legacy_events_pending";

interface AppDB extends DBSchema {
	data: {
		key: string;
		value: unknown;
	};
}

export type DbStatus = "idle" | "blocked" | "error";

let status: DbStatus = "idle";
const listeners = new Set<(status: DbStatus) => void>();

const setStatus = (next: DbStatus) => {
	if (status === next) return;
	status = next;
	listeners.forEach((listener) => listener(next));
};

export const getDbStatus = (): DbStatus => status;

export const subscribeDbStatus = (
	listener: (status: DbStatus) => void,
): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const hasEvents = (value: unknown): boolean =>
	typeof value === "object" &&
	value !== null &&
	"events" in value &&
	Array.isArray(value.events) &&
	value.events.length > 0;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export const getDB = (): Promise<IDBPDatabase<AppDB>> => {
	if (!dbPromise) {
		dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
			async upgrade(db, oldVersion, _newVersion, tx) {
				if (!db.objectStoreNames.contains("data")) {
					db.createObjectStore("data");
				}

				// v1 -> v2: Events was removed. Keep its data aside for a
				// one-time download, then drop the old key.
				if (oldVersion > 0 && oldVersion < 2) {
					const store = tx.objectStore("data");
					const calendar = await store.get(LEGACY_CALENDAR_KEY);
					if (hasEvents(calendar)) {
						await store.put(calendar, LEGACY_EVENTS_PENDING_KEY);
					}
					await store.delete(LEGACY_CALENDAR_KEY);
				}
			},
			blocked() {
				// Another tab still has the old version open.
				setStatus("blocked");
			},
			blocking() {
				// A newer version is waiting in another tab: let it upgrade.
				const closing = dbPromise;
				dbPromise = null;
				closing?.then((db) => db.close());
			},
			terminated() {
				dbPromise = null;
			},
		})
			.then((db) => {
				setStatus("idle");
				return db;
			})
			.catch((error: unknown) => {
				dbPromise = null;
				setStatus("error");
				throw error;
			});
	}
	return dbPromise;
};

/** Surfaces write failures (quota exceeded and similar) through the status. */
const withErrorStatus = async <T>(operation: () => Promise<T>): Promise<T> => {
	try {
		return await operation();
	} catch (error) {
		setStatus("error");
		throw error;
	}
};

export const getValue = async <T>(key: string): Promise<T | null> => {
	const db = await getDB();
	return ((await db.get("data", key)) as T | undefined) ?? null;
};

export const setValue = <T>(key: string, value: T): Promise<void> =>
	withErrorStatus(async () => {
		const db = await getDB();
		await db.put("data", value, key);
	});

export const deleteValue = (key: string): Promise<void> =>
	withErrorStatus(async () => {
		const db = await getDB();
		await db.delete("data", key);
	});

/** Test helper: close and forget the cached connection. */
export const resetDBForTests = async (): Promise<void> => {
	const open = dbPromise;
	dbPromise = null;
	if (open) (await open.catch(() => null))?.close();
	setStatus("idle");
};

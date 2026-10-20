import { getFromIndexedDB, saveToIndexedDB } from "./database";

const OPFS_MIGRATION_KEY = "opfs_data_migration_v1";
const APP_DATA_DIRECTORY_NAME = "app-data";
const APP_DATA_KEYS = [
	"redux_calendar_data",
	"redux_markdown_data",
	"redux_expenses_data",
	"redux_finance_data",
];
export const APP_DIRECTORY_NAME = "DTD_Tasks";

export const isMobileStorage = (): boolean =>
	typeof navigator !== "undefined" &&
	/(android|iphone|ipad|ipod|mobile)/i.test(navigator.userAgent);

export const getOPFSDirectory = async (): Promise<FileSystemDirectoryHandle> => {
	if (!navigator.storage?.getDirectory) {
		throw new Error("This browser does not support OPFS storage.");
	}
	return navigator.storage.getDirectory();
};

const getOPFSAppDataDirectory = async (
	create: boolean,
): Promise<FileSystemDirectoryHandle> => {
	const root = await getOPFSDirectory();
	const appDirectory = await root.getDirectoryHandle(APP_DIRECTORY_NAME, {
		create,
	});
	return appDirectory.getDirectoryHandle(APP_DATA_DIRECTORY_NAME, { create });
};

const writeTextFile = async (
	directory: FileSystemDirectoryHandle,
	fileName: string,
	content: string,
): Promise<void> => {
	const fileHandle = await directory.getFileHandle(fileName, {
		create: true,
	});
	const writable = await fileHandle.createWritable();
	try {
		await writable.write(content);
		await writable.close();
	} catch (error) {
		await writable.abort();
		throw error;
	}
};

export const readTextFile = async (
	directory: FileSystemDirectoryHandle,
	fileName: string,
): Promise<string | null> => {
	try {
		const fileHandle = await directory.getFileHandle(fileName);
		return await (await fileHandle.getFile()).text();
	} catch (error) {
		if (error instanceof DOMException && error.name === "NotFoundError") {
			return null;
		}
		throw error;
	}
};

export const readBlobAsText = async (blob: Blob): Promise<string> => {
	if (typeof blob.text === "function") return blob.text();
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsText(blob);
	});
};

let migrationPromise: Promise<void> | null = null;

const migrateIndexedDBToOPFS = async (): Promise<void> => {
	const completed = await getFromIndexedDB<boolean>(OPFS_MIGRATION_KEY);
	if (completed) return;

	const directory = await getOPFSAppDataDirectory(true);
	for (const key of APP_DATA_KEYS) {
		const data = await getFromIndexedDB<unknown>(key);
		if (data === null) continue;

		const serialized = JSON.stringify(data);
		await writeTextFile(directory, `${key}.json`, serialized);
		const copied = await readTextFile(directory, `${key}.json`);
		if (copied !== serialized) {
			throw new Error(`OPFS migration verification failed for ${key}.`);
		}
	}

	await saveToIndexedDB(OPFS_MIGRATION_KEY, true);
};

const ensureOPFSMigration = async (): Promise<void> => {
	if (!migrationPromise) {
		migrationPromise = migrateIndexedDBToOPFS().catch((error: unknown) => {
			migrationPromise = null;
			throw error;
		});
	}
	return migrationPromise;
};

export const saveAppData = async <T>(key: string, data: T): Promise<void> => {
	if (!isMobileStorage()) {
		await saveToIndexedDB(key, data);
		return;
	}

	try {
		await ensureOPFSMigration();
		const directory = await getOPFSAppDataDirectory(true);
		await writeTextFile(directory, `${key}.json`, JSON.stringify(data));
	} catch (error) {
		console.error("OPFS save failed; using IndexedDB fallback:", error);
		await saveToIndexedDB(key, data);
	}
};

export const getAppData = async <T>(key: string): Promise<T | null> => {
	if (!isMobileStorage()) return getFromIndexedDB<T>(key);

	try {
		await ensureOPFSMigration();
		const directory = await getOPFSAppDataDirectory(true);
		const serialized = await readTextFile(directory, `${key}.json`);
		if (serialized !== null) return JSON.parse(serialized) as T;

		const fallback = await getFromIndexedDB<T>(key);
		if (fallback !== null) await saveAppData(key, fallback);
		return fallback;
	} catch (error) {
		console.error("OPFS read failed; using IndexedDB fallback:", error);
		return getFromIndexedDB<T>(key);
	}
};

export const isOPFSAvailable = (): boolean =>
	typeof navigator !== "undefined" &&
	typeof navigator.storage?.getDirectory === "function";

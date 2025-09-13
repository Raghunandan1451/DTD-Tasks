import { openDB } from "idb";
import { Middleware, Action } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";
import { debounce } from "@src/lib/utils/debounce";

// Enhanced storage configuration with expiry times
const sliceStorageKeys: Record<string, string> = {
	calendar: "redux_calendar_data",
	fileManager: "redux_markdown_data",
	expenses: "redux_expenses_data",
	finance: "redux_finance_data",
};

const debouncedSaves: Record<string, (state: unknown) => void> = {};

export const persistMiddleware: Middleware =
	(store) => (next) => (action: unknown) => {
		if (!isReduxAction(action)) return next(action);
		const result = next(action);

		if (typeof action.type === "string") {
			const sliceName = action.type.split("/")[0];

			if (sliceStorageKeys[sliceName]) {
				const key = sliceStorageKeys[sliceName];
				const state = store.getState() as RootState;
				const sliceState = state[sliceName as keyof RootState];

				if (!debouncedSaves[key]) {
					debouncedSaves[key] = debounce((stateToSave) => {
						saveToIndexedDB(key, stateToSave);
					}, 1000);
				}

				debouncedSaves[key](sliceState);
			}
		}

		return result;
	};

const isReduxAction = (
	action: unknown
): action is Action<string> & { type: string } => {
	return (
		typeof action === "object" &&
		action !== null &&
		"type" in action &&
		typeof action.type === "string"
	);
};

export const getDB = () =>
	openDB("AIO-List", 1, {
		upgrade(db) {
			if (!db.objectStoreNames.contains("data")) {
				db.createObjectStore("data");
			}
		},
	});

export const saveToIndexedDB = async <T>(
	key: string,
	data: T
): Promise<void> => {
	const db = await getDB();
	await db.put("data", data, key);
};

export const getFromIndexedDB = async <T>(key: string): Promise<T | null> => {
	const db = await getDB();
	return (await db.get("data", key)) ?? null;
};

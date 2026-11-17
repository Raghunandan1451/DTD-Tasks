import { Middleware, Action } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";
import { debounce } from "@src/lib/utils/debounce";
import { getValue, setValue } from "@src/lib/db/database";
import { getNotesStore } from "@src/lib/storage";
import type { FileState } from "@src/features/markdown/type";
import {
	ensureMarkdownBaseline,
	logPersistedMarkdown,
	resetMarkdownBaseline,
} from "@src/features/markdown/lib/markdownActivity";

const sliceStorageKeys: Record<string, string> = {
	fileManager: "redux_markdown_data",
	expenses: "redux_expenses_data",
	finance: "redux_finance_data",
};

/**
 * How each slice is written. Notes go through the active notes store (IndexedDB
 * in the browser, a folder on desktop); the rest are still plain IndexedDB values.
 */
const saveSlice = (sliceName: string, key: string, state: unknown): Promise<void> =>
	sliceName === "fileManager"
		? getNotesStore().saveTree(state as FileState)
		: saveToIndexedDB(key, state);

const debouncedSaves: Record<
	string,
	((state: unknown) => void) & { flush: () => void }
> = {};

/**
 * Writes any save still waiting for its debounce timer, then lets the notes
 * store finish its own queue. Call before the page or window goes away.
 */
export const flushPendingSaves = async (): Promise<void> => {
	for (const save of Object.values(debouncedSaves)) save.flush();
	// Saves that already started (from the flush above or earlier) must finish too.
	await Promise.allSettled([...inFlightSaves]);
	await getNotesStore().flush();
};

const inFlightSaves = new Set<Promise<void>>();

/** Runs only after a slice was actually written, never for a failed save. */
const afterSave: Record<string, (savedState: unknown) => void> = {
	fileManager: (savedState) => {
		void logPersistedMarkdown(savedState);
	},
};

const MARKDOWN_RELOAD_ACTION = "fileManager/setFileState";

export const persistMiddleware: Middleware =
	(store) => (next) => (action: unknown) => {
		if (!isReduxAction(action)) return next(action);

		const sliceName = action.type.split("/")[0];
		if (
			sliceName === "fileManager" &&
			action.type !== MARKDOWN_RELOAD_ACTION
		) {
			// Remember the tree as it was before the first edit this session.
			ensureMarkdownBaseline((store.getState() as RootState).fileManager);
		}

		const result = next(action);

		if (typeof action.type === "string") {
			if (action.type === MARKDOWN_RELOAD_ACTION) {
				// Hydrate/import loads data; it is not activity to log.
				resetMarkdownBaseline((store.getState() as RootState).fileManager);
			}

			if (sliceStorageKeys[sliceName]) {
				const key = sliceStorageKeys[sliceName];
				const state = store.getState() as RootState;
				const sliceState = state[sliceName as keyof RootState];

				if (!debouncedSaves[key]) {
					debouncedSaves[key] = debounce((stateToSave) => {
						const saving: Promise<void> = saveSlice(sliceName, key, stateToSave)
							.then(() => afterSave[sliceName]?.(stateToSave))
							.catch((error) => {
								console.error(`Failed to persist ${key}`, error);
							})
							.finally(() => {
								inFlightSaves.delete(saving);
							});
						inFlightSaves.add(saving);
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

export const saveToIndexedDB = <T>(key: string, data: T): Promise<void> =>
	setValue(key, data);

export const getFromIndexedDB = <T>(key: string): Promise<T | null> =>
	getValue<T>(key);

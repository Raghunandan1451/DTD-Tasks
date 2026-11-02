import { Middleware, Action } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";
import { debounce } from "@src/lib/utils/debounce";
import { getValue, setValue } from "@src/lib/db/database";
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

const debouncedSaves: Record<string, (state: unknown) => void> = {};

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
						saveToIndexedDB(key, stateToSave)
							.then(() => afterSave[sliceName]?.(stateToSave))
							.catch((error) => {
								console.error(`Failed to persist ${key}`, error);
							});
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

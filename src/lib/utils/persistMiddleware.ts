import { Middleware, Action } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";
import { debounce } from "@src/lib/utils/debounce";
import { markSaved, markSaveFailed, markSaving } from "@src/lib/utils/saveStatus";
import { getValue, setValue } from "@src/lib/db/database";
import { getFinanceStore, getNotesStore } from "@src/lib/storage";
import type { ExpensesState } from "@src/lib/store/slices/expensesSlice";
import type { FinanceState } from "@src/features/finance/type";
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
 * How each slice is written. Notes and finance go through the active store
 * (IndexedDB in the browser, files in the data folder on desktop).
 */
const saveSlice = (sliceName: string, key: string, state: unknown): Promise<void> => {
	if (sliceName === "fileManager") return getNotesStore().saveTree(state as FileState);
	if (sliceName === "expenses") return getFinanceStore().saveExpenses(state as ExpensesState);
	if (sliceName === "finance") return getFinanceStore().saveFinance(state as FinanceState);
	return saveToIndexedDB(key, state);
};

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

/** Saves that failed, kept so "Retry" can write the same state again. */
const failedSaves = new Map<string, { sliceName: string; state: unknown }>();

/** Notes wait 2 s after the last keystroke, but never more than 10 s while typing continues. */
const NOTES_DELAY = 2000;
const NOTES_MAX_WAIT = 10000;
const DEFAULT_DELAY = 1000;

const runSave = (sliceName: string, key: string, stateToSave: unknown): Promise<void> => {
	const isNotes = sliceName === "fileManager";
	if (isNotes) markSaving();
	const saving: Promise<void> = saveSlice(sliceName, key, stateToSave)
		.then(() => {
			failedSaves.delete(key);
			if (isNotes) markSaved();
			afterSave[sliceName]?.(stateToSave);
		})
		.catch((error) => {
			console.error(`Failed to persist ${key}`, error);
			// The text stays in memory; the next edit or "Retry" writes it again.
			failedSaves.set(key, { sliceName, state: stateToSave });
			markSaveFailed(error);
		})
		.finally(() => {
			inFlightSaves.delete(saving);
		});
	inFlightSaves.add(saving);
	return saving;
};

/** Tries again every save that failed. Used by the "Retry" button next to the error. */
export const retryFailedSaves = async (): Promise<void> => {
	const entries = [...failedSaves.entries()];
	await Promise.allSettled(entries.map(([key, { sliceName, state }]) => runSave(sliceName, key, state)));
};

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
					const isNotes = sliceName === "fileManager";
					debouncedSaves[key] = debounce(
						(stateToSave) => {
							void runSave(sliceName, key, stateToSave);
						},
						isNotes ? NOTES_DELAY : DEFAULT_DELAY,
						isNotes ? NOTES_MAX_WAIT : undefined,
					);
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

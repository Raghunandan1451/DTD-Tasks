import { Middleware, Action } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";
import { debounce } from "@src/lib/utils/debounce";
import { saveAppData } from "@src/lib/utils/fileStorage/appData";

export {
	getFromIndexedDB,
	saveToIndexedDB,
} from "@src/lib/utils/fileStorage/database";

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
						void saveAppData(key, stateToSave).catch((error: unknown) => {
							console.error(`Failed to persist ${key}:`, error);
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

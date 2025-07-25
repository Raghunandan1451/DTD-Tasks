import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
	persistMiddleware,
	getFromIndexedDB,
	saveToIndexedDB,
} from "@src/lib/utils/persistMiddleware";
import { openDB } from "idb";

// Mock idb and in-memory store
vi.mock("idb", () => {
	const db = {
		data: {} as Record<string, unknown>,
		put: vi.fn(async (_store: string, value: unknown, key: string) => {
			db.data[key] = value;
		}),
		get: vi.fn(async (_store: string, key: string) => db.data[key]),
	};
	return {
		openDB: vi.fn(() => db),
	};
});

describe("persistMiddleware", () => {
	let store: ReturnType<typeof configureStore>;
	let testSlice: ReturnType<typeof createSlice>;

	beforeEach(() => {
		testSlice = createSlice({
			name: "fileManager",
			initialState: { value: 0 },
			reducers: {
				increment: (state) => {
					state.value += 1;
				},
				setValue: (state, action: PayloadAction<number>) => {
					state.value = action.payload;
				},
			},
		});

		store = configureStore({
			reducer: {
				fileManager: testSlice.reducer,
			},
			middleware: (getDefaultMiddleware) =>
				getDefaultMiddleware().concat(persistMiddleware),
		});
	});

	it("saves to IndexedDB when fileManager state changes", async () => {
		store.dispatch(testSlice.actions.setValue(42));

		await new Promise((r) => setTimeout(r, 1100)); // Wait for debounce to flush

		const db = await openDB();
		expect(db.put).toHaveBeenCalledWith(
			"data",
			{ value: 42 },
			"redux_markdown_data"
		);
	});
});

describe("IndexedDB helpers", () => {
	it("can save and retrieve data using saveToIndexedDB and getFromIndexedDB", async () => {
		const testKey = "test_key";
		const testData = { hello: "world" };

		await saveToIndexedDB(testKey, testData);
		const result = await getFromIndexedDB<typeof testData>(testKey);

		expect(result).toEqual(testData);
	});
});

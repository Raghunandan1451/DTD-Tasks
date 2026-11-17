import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { getValue, resetDBForTests } from "@src/lib/db/database";
import {
	NOTES_STORAGE_KEY,
	indexedDbNotesStore,
} from "@src/lib/storage/indexedDbStorage";
import {
	createMemoryBoardsStore,
	createMemoryNotesStore,
	createMemoryStorage,
} from "@src/lib/storage/memoryStorage";
import {
	createBoard,
	getBoard,
	getNotesStore,
	getStorage,
	listBoards,
	resetStorage,
	setStorage,
} from "@src/lib/storage";
import { persistMiddleware, flushPendingSaves } from "@src/lib/utils/persistMiddleware";
import markdownReducer, {
	addFile,
	updateFileContent,
} from "@src/lib/store/slices/markdownSlice";
import { hydrateMarkdown } from "@src/lib/store/thunks/markdownThunk";
import { debounce } from "@src/lib/utils/debounce";
import type { FileState } from "@src/features/markdown/type";

const state = (files: FileState["files"] = []): FileState => ({
	files,
	selectedFile: null,
	content: "",
	loaded: true,
});

beforeEach(async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
	resetStorage();
});

afterEach(() => {
	resetStorage();
	vi.useRealTimers();
});

describe("IndexedDB notes store", () => {
	it("saves and loads the tree under the original key", async () => {
		expect(await indexedDbNotesStore.loadTree()).toBeNull();

		const tree = state([{ id: "a", type: "file", path: "a.md", content: "hi" }]);
		await indexedDbNotesStore.saveTree(tree);

		expect(await getValue(NOTES_STORAGE_KEY)).toEqual(tree);
		expect(await indexedDbNotesStore.loadTree()).toEqual(tree);
		await expect(indexedDbNotesStore.flush()).resolves.toBeUndefined();
	});

	it("keeps the storage key that existing users' notes are saved under", () => {
		expect(NOTES_STORAGE_KEY).toBe("redux_markdown_data");
	});
});

describe("memory notes store", () => {
	it("returns copies and records the file steps for each save", async () => {
		const store = createMemoryNotesStore();
		expect(await store.loadTree()).toBeNull();

		const first = state([{ id: "a", type: "file", path: "a.md", content: "one" }]);
		await store.saveTree(first);
		first.files[0] = { id: "a", type: "file", path: "a.md", content: "changed outside" };
		expect((await store.loadTree())?.files[0]).toMatchObject({ content: "one" });

		await store.saveTree(
			state([{ id: "a", type: "file", path: "b.md", content: "two" }]),
		);
		expect(store.ops).toEqual([
			{ type: "create", id: "a", kind: "file", path: "a.md", content: "one" },
			{ type: "rename", id: "a", kind: "file", from: "a.md", to: "b.md" },
			{ type: "write", id: "a", path: "b.md", content: "two" },
		]);
	});
});

describe("active storage", () => {
	it("uses IndexedDB until another store is set", async () => {
		const created = await createBoard("Default");
		expect(getStorage().boards.getBoard).toBeTypeOf("function");
		expect((await getBoard(created.id))?.name).toBe("Default");
	});

	it("sends board calls to whichever store is active", async () => {
		const memory = createMemoryBoardsStore();
		setStorage({ notes: createMemoryNotesStore(), boards: memory });

		const created = await createBoard("In memory");

		expect(await memory.getBoard(created.id)).toEqual(created);
		expect((await listBoards()).map((b) => b.id)).toEqual([created.id]);

		resetStorage();
		// The browser database was never touched.
		expect(await listBoards()).toEqual([]);
	});

	it("sends notes calls to the active notes store", async () => {
		const notes = createMemoryNotesStore(state());
		setStorage({ notes, boards: createMemoryBoardsStore() });
		expect(getNotesStore()).toBe(notes);
	});
});

describe("debounce flush", () => {
	it("runs a pending call at once with the latest arguments, only once", () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const debounced = debounce(fn as (...args: unknown[]) => void, 1000);

		debounced("first");
		debounced("second");
		debounced.flush();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith("second");

		vi.advanceTimersByTime(2000);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("does nothing when nothing is pending, and still debounces normally", () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const debounced = debounce(fn as (...args: unknown[]) => void, 1000);

		debounced.flush();
		expect(fn).not.toHaveBeenCalled();

		debounced("a");
		vi.advanceTimersByTime(999);
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(fn).toHaveBeenCalledWith("a");
	});
});

describe("notes through the store", () => {
	const makeStore = () =>
		configureStore({
			reducer: { fileManager: markdownReducer },
			middleware: (getDefault) => getDefault().concat(persistMiddleware),
		});

	it("hydrates the tree from the active notes store", async () => {
		const notes = createMemoryNotesStore(
			state([{ id: "a", type: "file", path: "saved.md", content: "from store" }]),
		);
		setStorage({ notes, boards: createMemoryBoardsStore() });
		const store = makeStore();

		await store.dispatch(hydrateMarkdown());

		expect(store.getState().fileManager.files).toEqual([
			{ id: "a", type: "file", path: "saved.md", content: "from store" },
		]);
	});

	// Real timers on purpose: after each save the activity log opens the browser
	// database, which would hang under fake timers. The notes store starts from
	// the same tree as Redux so only the edits show up as file steps.
	const setup = () => {
		const store = makeStore();
		const storage = createMemoryStorage();
		storage.notes = createMemoryNotesStore(store.getState().fileManager);
		setStorage(storage);
		return { store, notes: storage.notes };
	};

	it("writes edits to the notes store after the debounce, as file steps", async () => {
		const { store, notes } = setup();

		store.dispatch(addFile({ id: "n1", path: "idea.md", content: "", parentPath: "" }));
		store.dispatch(updateFileContent({ path: "idea.md", content: "hello" }));
		expect(notes.ops).toEqual([]);

		await new Promise((resolve) => setTimeout(resolve, 1200));

		expect(notes.ops).toEqual([
			{ type: "create", id: "n1", kind: "file", path: "idea.md", content: "hello" },
		]);
	});

	it("flushPendingSaves writes straight away instead of waiting for the debounce", async () => {
		const { store, notes } = setup();

		store.dispatch(addFile({ id: "n2", path: "quick.md", content: "x", parentPath: "" }));
		expect(notes.ops).toEqual([]);

		await flushPendingSaves();

		expect(notes.ops).toEqual([
			{ type: "create", id: "n2", kind: "file", path: "quick.md", content: "x" },
		]);
	});
});

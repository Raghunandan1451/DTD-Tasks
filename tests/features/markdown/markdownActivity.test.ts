import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it } from "vitest";
import markdownReducer, {
	addFile,
	deleteFile,
	renameFile,
	setFileState,
	updateFileContent,
} from "@src/lib/store/slices/markdownSlice";
import { persistMiddleware } from "@src/lib/utils/persistMiddleware";
import { resetDBForTests } from "@src/lib/db/database";
import { getMarkdownLogInRange } from "@src/lib/db/markdownLogRepo";
import { clearMarkdownBaselineForTests } from "@src/features/markdown/lib/markdownActivity";

const makeStore = () =>
	configureStore({
		reducer: { fileManager: markdownReducer },
		middleware: (getDefault) =>
			getDefault({ serializableCheck: false }).concat(persistMiddleware),
	});

const settle = () => new Promise((resolve) => setTimeout(resolve, 1300));
const rows = () => getMarkdownLogInRange("0000-00-00", "9999-99-99");

beforeEach(async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
	clearMarkdownBaselineForTests();
});

describe("markdown activity logging", () => {
	it("does not log hydrate or import", async () => {
		const store = makeStore();
		store.dispatch(
			setFileState({
				files: [{ id: "f1", path: "a.md", type: "file", content: "x" }],
				selectedFile: null,
				content: "",
				loaded: true,
			}),
		);
		await settle();
		expect(await rows()).toEqual([]);
	});

	it("logs ten saves of one file as a single edited row", async () => {
		const store = makeStore();
		store.dispatch(
			setFileState({
				files: [{ id: "f1", path: "a.md", type: "file", content: "" }],
				selectedFile: null,
				content: "",
				loaded: true,
			}),
		);
		for (let i = 1; i <= 10; i++) {
			store.dispatch(updateFileContent({ path: "a.md", content: `v${i}` }));
			await settle();
		}
		const log = await rows();
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({ fileId: "f1", name: "a.md", action: "edited" });
	}, 30000);

	it("logs create, rename and delete and keeps the rows readable", async () => {
		const store = makeStore();
		store.dispatch(
			setFileState({ files: [], selectedFile: null, content: "", loaded: true }),
		);
		store.dispatch(addFile({ id: "f1", path: "Idea.md", content: "", parentPath: "" }));
		await settle();
		store.dispatch(renameFile({ oldPath: "Idea.md", newName: "Plan.md" }));
		await settle();
		store.dispatch(deleteFile({ path: "Plan.md" }));
		await settle();

		const log = await rows();
		expect(log.map((r) => [r.action, r.name]).sort()).toEqual([
			["created", "Idea.md"],
			["deleted", "Plan.md"],
			["renamed", "Plan.md"],
		]);
		expect(log.find((r) => r.action === "renamed")?.meta?.oldName).toBe("Idea.md");
		expect(new Set(log.map((r) => r.fileId))).toEqual(new Set(["f1"]));
	}, 15000);

	it("logs activity from a fresh session that never hydrated", async () => {
		const store = makeStore();
		store.dispatch(addFile({ id: "n1", path: "New.md", content: "", parentPath: "" }));
		await settle();
		expect((await rows()).map((r) => [r.action, r.name])).toEqual([
			["created", "New.md"],
		]);
	});
});

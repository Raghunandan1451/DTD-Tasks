import { describe, expect, it } from "vitest";
import type { Board } from "@src/lib/db/types";
import { createFolderBoardsStore } from "@src/lib/storage/folder/folderBoardsStore";
import { fakeFs } from "./fakeFolderFs";

const base = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };

const fileJson = (board: Partial<Board>) =>
	JSON.stringify({
		schemaVersion: 1,
		board: {
			id: "b1",
			name: "Plans",
			...base,
			createdAt: 1,
			updatedAt: 1,
			...board,
		},
	});

describe("folder boards store", () => {
	it("writes one board per file, named after the board", async () => {
		const h = fakeFs();
		const store = createFolderBoardsStore(h.fs);
		const board = await store.createBoard("Plans");
		expect(h.files.has("Boards/Plans.board.json")).toBe(true);
		const saved = JSON.parse(h.files.get("Boards/Plans.board.json")!);
		expect(saved.board.id).toBe(board.id);
		expect(saved.schemaVersion).toBeTypeOf("number");
	});

	it("gives two boards with the same name different files", async () => {
		const h = fakeFs();
		const store = createFolderBoardsStore(h.fs);
		await store.createBoard("Plans");
		await store.createBoard("plans");
		await store.createBoard("Plans");
		expect(h.files.size).toBe(3);
		const names = [...h.files.keys()].map((k) => k.toLowerCase());
		expect(new Set(names).size).toBe(3);
		expect(names).toContain("boards/plans (2).board.json");
	});

	it("renames the file when the board is renamed, keeping the content", async () => {
		const h = fakeFs();
		const store = createFolderBoardsStore(h.fs);
		const board = await store.createBoard("Old");
		await store.renameBoard(board.id, "New");
		expect(h.files.has("Boards/Old.board.json")).toBe(false);
		expect(JSON.parse(h.files.get("Boards/New.board.json")!).board.name).toBe("New");
	});

	it("keeps the old file name when the rename fails, and still saves the board", async () => {
		const h = fakeFs();
		const store = createFolderBoardsStore(h.fs);
		const board = await store.createBoard("Old");
		h.fs.rename = async () => {
			throw new Error("locked");
		};
		await store.renameBoard(board.id, "New");
		expect(JSON.parse(h.files.get("Boards/Old.board.json")!).board.name).toBe("New");
	});

	it("moves a deleted board to the trash", async () => {
		const h = fakeFs();
		const store = createFolderBoardsStore(h.fs);
		const board = await store.createBoard("Gone");
		await store.deleteBoard(board.id);
		expect(h.trashed).toEqual(["Boards/Gone.board.json"]);
		expect(await store.countBoards()).toBe(0);
	});

	it("loads boards from a second store, and remembers the last board", async () => {
		const h = fakeFs();
		const first = createFolderBoardsStore(h.fs);
		const board = await first.createBoard("Plans");
		await first.setLastBoardId(board.id);
		const second = createFolderBoardsStore(h.fs);
		expect((await second.listBoards()).map((b) => b.id)).toEqual([board.id]);
		expect(await second.getLastBoardId()).toBe(board.id);
	});

	it("lists a damaged file as unreadable and never touches it", async () => {
		const h = fakeFs({ "Boards/Broken.board.json": "{nope", "Boards/Fine.board.json": fileJson({}) });
		const store = createFolderBoardsStore(h.fs);
		expect(await store.countBoards()).toBe(1);
		expect((await store.problems()).map((p) => p.file)).toEqual(["Broken.board.json"]);
		// A new board with the same name must not take the damaged file's name.
		await store.createBoard("Broken");
		expect(h.files.get("Boards/Broken.board.json")).toBe("{nope");
		expect(h.files.has("Boards/Broken (2).board.json")).toBe(true);
	});

	it("ignores subfolders, other files and hidden files in Boards", async () => {
		const h = fakeFs({
			"Boards/sub/inner.board.json": fileJson({ id: "x" }),
			"Boards/readme.txt": "hi",
			"Boards/.hidden.board.json": fileJson({ id: "y" }),
		});
		const store = createFolderBoardsStore(h.fs);
		expect(await store.countBoards()).toBe(0);
		expect(await store.problems()).toEqual([]);
	});

	it("gives a copied board file a new id and tells the user", async () => {
		const h = fakeFs({
			"Boards/A.board.json": fileJson({ name: "A" }),
			"Boards/A copy.board.json": fileJson({ name: "A copy" }),
		});
		const store = createFolderBoardsStore(h.fs);
		const boards = await store.listBoards();
		expect(new Set(boards.map((b) => b.id)).size).toBe(2);
		expect((await store.problems())[0].reason).toMatch(/same id/);
		const ids = ["A", "A copy"].map(
			(name) => JSON.parse(h.files.get(`Boards/${name}.board.json`)!).board.id,
		);
		expect(new Set(ids).size).toBe(2);
	});

	it("saves in order: the last change wins even when saves overlap", async () => {
		const h = fakeFs();
		const store = createFolderBoardsStore(h.fs);
		const board = await store.createBoard("Plans");
		await Promise.all([
			store.saveBoardContent(board.id, { ...base, viewport: { x: 1, y: 1, zoom: 1 } }),
			store.saveBoardContent(board.id, { ...base, viewport: { x: 2, y: 2, zoom: 1 } }),
			store.saveBoardContent(board.id, { ...base, viewport: { x: 3, y: 3, zoom: 1 } }),
		]);
		expect(JSON.parse(h.files.get("Boards/Plans.board.json")!).board.viewport.x).toBe(3);
	});

	it("uses Windows-safe file names", async () => {
		const h = fakeFs();
		const store = createFolderBoardsStore(h.fs);
		await store.createBoard('Q1: "plan"?');
		expect(h.files.has('Boards/Q1_ _plan__.board.json')).toBe(true);
	});
});

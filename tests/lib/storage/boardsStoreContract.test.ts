import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDBForTests } from "@src/lib/db/database";
import { indexedDbBoardsStore } from "@src/lib/storage/indexedDbStorage";
import { createMemoryBoardsStore } from "@src/lib/storage/memoryStorage";
import type { BoardsStore } from "@src/lib/storage";
import type { Board } from "@src/lib/db/types";

const board = (overrides: Partial<Board> = {}): Board => ({
	id: "b1",
	name: "Board",
	nodes: [],
	edges: [],
	viewport: { x: 0, y: 0, zoom: 1 },
	createdAt: 1000,
	updatedAt: 1000,
	...overrides,
});

const base = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };

// Every BoardsStore must behave the same. The same checks run against each one.
const implementations: [string, () => Promise<BoardsStore>][] = [
	[
		"IndexedDB",
		async () => {
			await resetDBForTests();
			globalThis.indexedDB = new IDBFactory();
			return indexedDbBoardsStore;
		},
	],
	["memory", async () => createMemoryBoardsStore()],
];

describe.each(implementations)("BoardsStore contract: %s", (_name, make) => {
	let store: BoardsStore;

	beforeEach(async () => {
		store = await make();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("creates boards with trimmed names and defaults", async () => {
		const named = await store.createBoard("  Plans  ");
		const unnamed = await store.createBoard("   ");

		expect(named.name).toBe("Plans");
		expect(unnamed.name).toBe("Untitled board");
		expect(named.layoutMode).toBe("free");
		expect(named.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
		expect(await store.getBoard(named.id)).toEqual(named);
		expect(await store.countBoards()).toBe(2);
		expect(await store.getBoard("ghost")).toBeNull();
	});

	it("lists newest-updated first and moves a saved board to the top", async () => {
		const a = await store.createBoard("A");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(Date.now() + 5000);
		const b = await store.createBoard("B");
		expect((await store.listBoards()).map((x) => x.id)).toEqual([b.id, a.id]);

		vi.setSystemTime(Date.now() + 5000);
		await store.saveBoard(a);
		expect((await store.listBoards()).map((x) => x.id)).toEqual([a.id, b.id]);
	});

	it("renames a board and rejects a missing one", async () => {
		const created = await store.createBoard("Old");
		expect((await store.renameBoard(created.id, "  New  ")).name).toBe("New");
		expect((await store.getBoard(created.id))?.name).toBe("New");
		await expect(store.renameBoard("ghost", "x")).rejects.toThrow(
			"That board no longer exists.",
		);
	});

	it("keeps a rename made while the canvas was open, and bumps updatedAt only when asked", async () => {
		const created = await store.createBoard("Before");
		await store.renameBoard(created.id, "After");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(created.updatedAt + 10_000);

		const touched = await store.saveBoardContent(created.id, base);
		expect(touched?.name).toBe("After");
		expect(touched?.createdAt).toBe(created.createdAt);
		expect(touched?.updatedAt).toBe(created.updatedAt + 10_000);

		vi.setSystemTime(created.updatedAt + 20_000);
		const untouched = await store.saveBoardContent(
			created.id,
			{ ...base, viewport: { x: 9, y: 9, zoom: 2 } },
			{ touch: false },
		);
		expect(untouched?.updatedAt).toBe(created.updatedAt + 10_000);
		expect(untouched?.viewport).toEqual({ x: 9, y: 9, zoom: 2 });
	});

	it("round-trips layout and grid settings, and clears the ones left out", async () => {
		const created = await store.createBoard("Table", "grid");
		await store.saveBoardContent(created.id, {
			...base,
			layoutMode: "grid",
			gridColumns: 2,
			gridRowLabels: ["Mon"],
			gridColumnLabels: ["Task", "Owner"],
			gridCornerLabel: "Days x Exercise",
		});
		expect(await store.getBoard(created.id)).toMatchObject({
			gridColumns: 2,
			gridRowLabels: ["Mon"],
			gridColumnLabels: ["Task", "Owner"],
			gridCornerLabel: "Days x Exercise",
		});

		await store.saveBoardContent(created.id, {
			...base,
			layoutMode: "grid",
			gridRowLabels: [],
			gridColumnLabels: [],
			gridCornerLabel: "",
		});
		const cleared = await store.getBoard(created.id);
		expect(cleared?.gridColumns).toBeUndefined();
		expect(cleared?.gridRowLabels).toBeUndefined();
		expect(cleared?.gridColumnLabels).toBeUndefined();
		expect(cleared?.gridCornerLabel).toBeUndefined();
	});

	it("duplicates under a new id, keeps type and content, and stays independent", async () => {
		const created = await store.createBoard("Original", "tree");
		const nodes = [
			{ id: "n1", type: "note" as const, position: { x: 1, y: 2 }, data: { color: "cyan" as const } },
		];
		await store.saveBoardContent(created.id, { ...base, layoutMode: "tree", nodes });

		const copy = await store.duplicateBoard(created.id);
		expect(copy.id).not.toBe(created.id);
		expect(copy.name).toBe("Original (copy)");
		expect(copy.layoutMode).toBe("tree");
		expect(copy.nodes).toEqual(nodes);

		await store.saveBoardContent(copy.id, { ...base, layoutMode: "tree", nodes: [] });
		expect((await store.getBoard(created.id))?.nodes).toHaveLength(1);
		await expect(store.duplicateBoard("ghost")).rejects.toThrow("no longer exists");
	});

	it("deletes a board and does not bring it back when content is saved later", async () => {
		const created = await store.createBoard("Gone");
		await store.deleteBoard(created.id);

		expect(await store.getBoard(created.id)).toBeNull();
		expect(await store.saveBoardContent(created.id, base)).toBeNull();
		expect(await store.getBoard(created.id)).toBeNull();
		expect(await store.countBoards()).toBe(0);
	});

	it("merges by id: adds missing boards, never touches existing ones", async () => {
		await store.mergeBoards([board({ id: "keep", name: "Mine" })]);

		const result = await store.mergeBoards([
			board({ id: "keep", name: "Theirs" }),
			board({ id: "fresh", name: "Fresh" }),
			board({ id: "fresh", name: "Again" }),
		]);

		expect(result).toEqual({ added: 1, skipped: 2 });
		expect((await store.getBoard("keep"))?.name).toBe("Mine");
		expect((await store.getBoard("fresh"))?.name).toBe("Fresh");
	});

	it("returns copies, so changing a result never changes what is stored", async () => {
		const created = await store.createBoard("Safe");
		const read = await store.getBoard(created.id);
		read!.name = "Changed outside";
		expect((await store.getBoard(created.id))?.name).toBe("Safe");
	});

	it("remembers the last opened board", async () => {
		expect(await store.getLastBoardId()).toBeNull();
		await store.setLastBoardId("b9");
		expect(await store.getLastBoardId()).toBe("b9");
	});
});

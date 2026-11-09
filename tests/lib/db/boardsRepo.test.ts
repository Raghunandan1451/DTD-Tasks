import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkerType } from "@xyflow/react";
import { getDB, getDbStatus, resetDBForTests } from "@src/lib/db/database";
import {
	countBoards,
	createBoard,
	deleteBoard,
	duplicateBoard,
	getBoard,
	getLastBoardId,
	listBoards,
	mergeBoards,
	renameBoard,
	saveBoard,
	saveBoardContent,
	setLastBoardId,
} from "@src/lib/db/boardsRepo";
import {
	toBoardEdges,
	toBoardNodes,
	type FlowEdge,
	type FlowNode,
} from "@src/features/nodes/lib/serialize";
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

beforeEach(async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("boards", () => {
	it("creates a board with defaults and trims or falls back on the name", async () => {
		const named = await createBoard("  Plans  ");
		const unnamed = await createBoard("   ");

		expect(named.name).toBe("Plans");
		expect(unnamed.name).toBe("Untitled board");
		expect(named.nodes).toEqual([]);
		expect(named.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
		expect(await getBoard(named.id)).toEqual(named);
		expect(await countBoards()).toBe(2);
	});

	it("lists boards by last update, newest first", async () => {
		const db = await getDB();
		await db.put("boards", board({ id: "old", updatedAt: 100 }));
		await db.put("boards", board({ id: "new", updatedAt: 300 }));
		await db.put("boards", board({ id: "mid", updatedAt: 200 }));

		expect((await listBoards()).map((b) => b.id)).toEqual(["new", "mid", "old"]);
	});

	it("moves a board to the top when it is saved", async () => {
		const a = await createBoard("A");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(Date.now() + 5000);
		const b = await createBoard("B");
		expect((await listBoards()).map((x) => x.id)).toEqual([b.id, a.id]);

		vi.setSystemTime(Date.now() + 5000);
		await saveBoard(a);
		expect((await listBoards()).map((x) => x.id)).toEqual([a.id, b.id]);
	});

	it("renames a board and reports a missing one", async () => {
		const created = await createBoard("Old");
		const renamed = await renameBoard(created.id, "  New  ");

		expect(renamed.name).toBe("New");
		expect((await getBoard(created.id))?.name).toBe("New");
		await expect(renameBoard("ghost", "x")).rejects.toThrow("That board no longer exists.");
	});

	it("saves grid row and column names, clears them when absent, and copies them on duplicate", async () => {
		const created = await createBoard("Table", "grid");
		const content = {
			nodes: [],
			edges: [],
			viewport: { x: 0, y: 0, zoom: 1 },
			layoutMode: "grid" as const,
			gridColumns: 2,
			gridRowLabels: ["Mon"],
			gridColumnLabels: ["Task", "Owner"],
			gridCornerLabel: "Days x Exercise",
		};
		await saveBoardContent(created.id, content);
		const stored = await getBoard(created.id);
		expect(stored?.gridCornerLabel).toBe("Days x Exercise");
		expect(stored?.gridRowLabels).toEqual(["Mon"]);
		expect(stored?.gridColumnLabels).toEqual(["Task", "Owner"]);

		const copy = await duplicateBoard(created.id);
		expect(copy.gridColumnLabels).toEqual(["Task", "Owner"]);

		// Removing every name removes the field instead of keeping an empty list.
		await saveBoardContent(created.id, {
			...content,
			gridRowLabels: [],
			gridColumnLabels: [],
			gridCornerLabel: "",
		});
		const cleared = await getBoard(created.id);
		expect(cleared?.gridRowLabels).toBeUndefined();
		expect(cleared?.gridColumnLabels).toBeUndefined();
		expect(cleared?.gridCornerLabel).toBeUndefined();
	});

	it("duplicates a board under a new id with a copy of its content", async () => {
		const created = await createBoard("Original");
		const content = {
			nodes: [{ id: "n1", type: "note" as const, position: { x: 1, y: 2 }, data: { color: "cyan" as const } }],
			edges: [],
			viewport: { x: 3, y: 4, zoom: 2 },
		};
		await saveBoardContent(created.id, content);

		const copy = await duplicateBoard(created.id);

		expect(copy.id).not.toBe(created.id);
		expect(copy.name).toBe("Original (copy)");
		expect(copy.nodes).toEqual(content.nodes);
		expect(copy.viewport).toEqual(content.viewport);
		expect(await countBoards()).toBe(2);

		// Changing the copy leaves the original alone.
		await saveBoardContent(copy.id, { ...content, nodes: [] });
		expect((await getBoard(created.id))?.nodes).toHaveLength(1);
		await expect(duplicateBoard("ghost")).rejects.toThrow("no longer exists");
	});

	it("deletes a board", async () => {
		const created = await createBoard("Gone");
		await deleteBoard(created.id);

		expect(await getBoard(created.id)).toBeNull();
		expect(await countBoards()).toBe(0);
	});

	it("remembers the last opened board", async () => {
		expect(await getLastBoardId()).toBeNull();
		await setLastBoardId("b9");
		expect(await getLastBoardId()).toBe("b9");
	});
});

describe("saving canvas content", () => {
	const content = {
		nodes: [{ id: "n1", type: "text" as const, position: { x: 0, y: 0 }, data: { color: "slate" as const } }],
		edges: [],
		viewport: { x: 9, y: 9, zoom: 0.5 },
	};

	it("keeps a rename that happened while the canvas was open", async () => {
		const created = await createBoard("Before");
		await renameBoard(created.id, "After");

		const saved = await saveBoardContent(created.id, content);

		expect(saved?.name).toBe("After");
		expect(saved?.createdAt).toBe(created.createdAt);
		expect((await getBoard(created.id))?.nodes).toEqual(content.nodes);
	});

	it("bumps updatedAt for content changes but not for viewport-only saves", async () => {
		const created = await createBoard("Time");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(created.updatedAt + 10_000);

		const touched = await saveBoardContent(created.id, content);
		expect(touched?.updatedAt).toBe(created.updatedAt + 10_000);

		vi.setSystemTime(created.updatedAt + 20_000);
		const untouched = await saveBoardContent(created.id, content, { touch: false });
		expect(untouched?.updatedAt).toBe(created.updatedAt + 10_000);
		expect(untouched?.viewport).toEqual(content.viewport);
	});

	it("does not bring a deleted board back", async () => {
		const created = await createBoard("Deleted");
		await deleteBoard(created.id);

		expect(await saveBoardContent(created.id, content)).toBeNull();
		expect(await getBoard(created.id)).toBeNull();
	});

	it("stores no React Flow runtime fields", async () => {
		const created = await createBoard("Clean");
		const nodes = [
			{
				id: "n1",
				type: "note",
				position: { x: 1, y: 2 },
				width: 200,
				height: 100,
				data: { title: "T", color: "amber" },
				selected: true,
				dragging: true,
				measured: { width: 200, height: 100 },
				positionAbsolute: { x: 1, y: 2 },
				internals: {},
			},
			{ id: "n2", type: "shape", position: { x: 5, y: 5 }, data: { color: "slate", shape: "ellipse" }, selected: false },
		] as unknown as FlowNode[];
		const edges = [
			{ id: "e1", source: "n1", target: "n2", type: "labeled", selected: true, markerEnd: { type: MarkerType.ArrowClosed }, label: "x" },
		] as unknown as FlowEdge[];

		await saveBoardContent(created.id, {
			nodes: toBoardNodes(nodes),
			edges: toBoardEdges(edges),
			viewport: { x: 0, y: 0, zoom: 1 },
		});

		const stored = await (await getDB()).get("boards", created.id);
		const runtime = ["selected", "dragging", "measured", "positionAbsolute", "internals", "resizing", "type"];
		for (const node of stored!.nodes) {
			for (const key of runtime.filter((k) => k !== "type")) expect(node).not.toHaveProperty(key);
		}
		for (const edge of stored!.edges) {
			for (const key of ["selected", "markerEnd", "type"]) expect(edge).not.toHaveProperty(key);
		}
		expect(stored!.edges[0]).toEqual({ id: "e1", source: "n1", target: "n2", label: "x", arrow: true });
	});
});

describe("merging boards", () => {
	it("adds boards that are missing and skips ones that exist", async () => {
		await mergeBoards([board({ id: "keep", name: "Mine" })]);

		const result = await mergeBoards([
			board({ id: "keep", name: "Theirs" }),
			board({ id: "fresh", name: "Fresh" }),
		]);

		expect(result).toEqual({ added: 1, skipped: 1 });
		expect((await getBoard("keep"))?.name).toBe("Mine");
		expect((await getBoard("fresh"))?.name).toBe("Fresh");
	});

	it("skips repeats inside one import", async () => {
		const result = await mergeBoards([board({ id: "x" }), board({ id: "x", name: "Again" })]);
		expect(result).toEqual({ added: 1, skipped: 1 });
		expect(await countBoards()).toBe(1);
	});

	it("adds nothing when the transaction fails part-way", async () => {
		// A function cannot be cloned into IndexedDB, so the second add throws.
		const poisoned = board({ id: "bad", name: (() => {}) as unknown as string });

		await expect(mergeBoards([board({ id: "ok" }), poisoned])).rejects.toBeTruthy();

		expect(await countBoards()).toBe(0);
		expect(getDbStatus()).toBe("error");
	});
});

describe("layout fields", () => {
	beforeEach(async () => {
		await resetDBForTests();
	});

	it("sets the type at creation and a duplicate keeps it", async () => {
		const tree = await createBoard("Org chart", "tree");
		expect(tree.layoutMode).toBe("tree");
		expect((await getBoard(tree.id))?.layoutMode).toBe("tree");

		const copy = await duplicateBoard(tree.id);
		expect(copy.layoutMode).toBe("tree");
	});

	it("new boards are free, and layout settings round-trip and can be cleared", async () => {
		const created = await createBoard("Layouts");
		expect(created.layoutMode).toBe("free");

		const base = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
		await saveBoardContent(created.id, {
			...base,
			layoutMode: "tree",
			outline: "A -> B",
			treeRootId: "n1",
		});
		expect(await getBoard(created.id)).toMatchObject({
			layoutMode: "tree",
			outline: "A -> B",
			treeRootId: "n1",
		});

		await saveBoardContent(created.id, { ...base, layoutMode: "free" });
		const cleared = await getBoard(created.id);
		expect(cleared?.layoutMode).toBe("free");
		expect(cleared?.outline).toBeUndefined();
		expect(cleared?.treeRootId).toBeUndefined();
	});
});

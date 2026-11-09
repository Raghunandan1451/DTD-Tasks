import { describe, expect, it } from "vitest";
import type { Board, BoardNode } from "@src/lib/db/types";
import {
	buildScene,
	buildScenes,
	sceneScale,
	uniqueFileStems,
} from "@src/features/nodes/lib/boardExport";

const node = (id: string, x: number, y: number, extra: Partial<BoardNode> = {}): BoardNode => ({
	id,
	type: "note",
	position: { x, y },
	data: { color: "slate", title: id },
	...extra,
});

const board = (overrides: Partial<Board> = {}): Board => ({
	id: "b1",
	name: "Plan",
	nodes: [node("a", 0, 0), node("b", 400, 0), node("c", 0, 300)],
	edges: [
		{ id: "e1", source: "a", target: "b", arrow: true, label: "next" },
		{ id: "e2", source: "b", target: "c" },
	],
	viewport: { x: 0, y: 0, zoom: 1 },
	createdAt: 1,
	updatedAt: 1,
	...overrides,
});

describe("buildScene", () => {
	it("returns null for a board with no nodes", () => {
		expect(buildScene(board({ nodes: [], edges: [] }))).toBeNull();
	});

	it("keeps saved positions and default sizes on a free board", () => {
		const scene = buildScene(board());
		expect(scene?.nodes.map((n) => [n.id, n.x, n.y, n.width, n.height])).toEqual([
			["a", 0, 0, 220, 140],
			["b", 400, 0, 220, 140],
			["c", 0, 300, 220, 140],
		]);
	});

	it("frames every node with a margin", () => {
		const scene = buildScene(board());
		expect(scene?.bounds).toEqual({ x: -40, y: -40, width: 620 + 80, height: 440 + 80 });
	});

	it("keeps only the selected nodes and the links between them", () => {
		const scene = buildScene(board(), new Set(["a", "b"]));
		expect(scene?.nodes.map((n) => n.id)).toEqual(["a", "b"]);
		expect(scene?.edges.map((e) => e.id)).toEqual(["e1"]);
	});

	it("draws everything when the selection is empty", () => {
		const scene = buildScene(board(), new Set());
		expect(scene?.nodes).toHaveLength(3);
		expect(scene?.edges).toHaveLength(2);
	});

	it("returns null when the selection matches no node", () => {
		expect(buildScene(board(), new Set(["missing"]))).toBeNull();
	});

	it("starts links on the node outline, not its centre", () => {
		const scene = buildScene(board());
		const edge = scene?.edges.find((e) => e.id === "e1");
		// a is 0..220 wide, b starts at 400; both sit on the same row.
		expect(edge?.from.x).toBeCloseTo(220);
		expect(edge?.to.x).toBeCloseTo(400);
		expect(edge?.arrow).toBe(true);
		expect(edge?.label).toBe("next");
	});

	it("uses computed positions on a grid board, not the saved ones", () => {
		const stacked = board({
			layoutMode: "grid",
			nodes: [node("a", 0, 0), node("b", 0, 0), node("c", 0, 0), node("d", 0, 0)],
			edges: [],
		});
		const scene = buildScene(stacked);
		const spots = new Set(scene?.nodes.map((n) => `${n.x},${n.y}`));
		expect(spots.size).toBe(4);
	});

	it("draws a grid board as a table with name cells", () => {
		const table = board({
			layoutMode: "grid",
			gridColumns: 2,
			gridRowLabels: ["Mon"],
			gridColumnLabels: ["Task", "Owner"],
			gridCornerLabel: "Days x Exercise",
			nodes: [
				node("a", 0, 0, { width: 100, height: 50 }),
				node("b", 0, 0, { width: 200, height: 40 }),
				node("c", 0, 0, { width: 80, height: 90 }),
				node("d", 0, 0, { width: 60, height: 30 }),
			],
			edges: [],
		});
		const scene = buildScene(table);
		expect(scene?.headers.map((h) => h.label)).toEqual([
			"Days x Exercise",
			"Task",
			"Owner",
			"Mon",
			"",
		]);
		// d is stretched to its column (200) and row (90).
		const d = scene?.nodes.find((n) => n.id === "d");
		expect([d?.width, d?.height]).toEqual([200, 90]);
		// The picture covers the names too.
		const names = scene?.headers ?? [];
		expect(scene!.bounds.x).toBeLessThan(Math.min(...names.map((h) => h.x)));
		expect(scene!.bounds.y).toBeLessThan(Math.min(...names.map((h) => h.y)));
	});

	it("leaves the names out when only some nodes are exported", () => {
		const table = board({
			layoutMode: "grid",
			gridColumns: 2,
			gridColumnLabels: ["Task"],
			nodes: [node("a", 0, 0), node("b", 0, 0)],
			edges: [],
		});
		expect(buildScene(table, new Set(["a"]))?.headers).toEqual([]);
	});

	it("falls back to a safe colour for an unknown one", () => {
		const odd = board({
			nodes: [node("a", 0, 0, { data: { color: "pink" as never } })],
			edges: [],
		});
		expect(buildScene(odd)?.nodes[0].color).toBe("slate");
	});
});

describe("buildScenes", () => {
	it("skips empty boards and applies the selection to its own board only", () => {
		const other = board({ id: "b2", name: "Other" });
		const empty = board({ id: "b3", name: "Empty", nodes: [], edges: [] });
		const scenes = buildScenes([board(), other, empty], {
			boardId: "b1",
			nodeIds: new Set(["a"]),
		});
		expect(scenes.map((s) => [s.name, s.nodes.length])).toEqual([
			["Plan", 1],
			["Other", 3],
		]);
	});
});

describe("uniqueFileStems", () => {
	it("removes characters files can't have and numbers repeats", () => {
		expect(uniqueFileStems(["Plan", "plan", "A/B:C", "  ", "Plan"])).toEqual([
			"Plan",
			"plan 2",
			"ABC",
			"Board",
			"Plan 3",
		]);
	});
});

describe("sceneScale", () => {
	it("is sharp for small boards and shrinks huge ones to fit a canvas", () => {
		expect(sceneScale({ x: 0, y: 0, width: 600, height: 400 })).toBe(2);
		expect(sceneScale({ x: 0, y: 0, width: 40000, height: 1000 })).toBeCloseTo(0.2);
	});
});

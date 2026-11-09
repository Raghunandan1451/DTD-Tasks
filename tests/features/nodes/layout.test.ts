import { describe, expect, it } from "vitest";
import {
	buildSpanningTree,
	computeLayout,
	layoutGraph,
	layoutGrid,
	layoutTree,
	type LayoutEdge,
	type LayoutNode,
} from "@src/features/nodes/lib/layout";

const nodes = (n: number): LayoutNode[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `n${i}`,
		width: 100,
		height: 50,
	}));
const edge = (id: string, source: string, target: string): LayoutEdge => ({
	id,
	source,
	target,
});

describe("layoutGrid", () => {
	it("uses ceil(sqrt(n)) columns", () => {
		const { positions } = layoutGrid(nodes(10)); // 4 columns
		const xs = new Set(Object.values(positions).map((p) => p.x));
		expect(xs.size).toBe(4);
		expect(positions.n4.y).toBeGreaterThan(positions.n0.y);
		expect(positions.n4.x).toBe(positions.n0.x);
	});

	it("handles empty and single input", () => {
		expect(layoutGrid([])).toEqual({ positions: {}, sizes: {}, headers: [] });
		expect(layoutGrid(nodes(1)).positions).toEqual({ n0: { x: 0, y: 0 } });
	});

	it("sizes each column and row separately and stretches cells to fit", () => {
		const list: LayoutNode[] = [
			{ id: "a", width: 100, height: 50 },
			{ id: "b", width: 200, height: 40 },
			{ id: "c", width: 80, height: 90 },
			{ id: "d", width: 60, height: 30 },
		];
		const { positions, sizes } = layoutGrid(list, { columns: 2, gapX: 10, gapY: 10 });
		// Column 0 is 100 wide (a), column 1 is 200 wide (b); row 0 is 50 tall, row 1 is 90.
		expect(positions.b).toEqual({ x: 110, y: 0 });
		expect(positions.c).toEqual({ x: 0, y: 60 });
		expect(positions.d).toEqual({ x: 110, y: 60 });
		expect(sizes.a).toEqual({ width: 100, height: 50 });
		expect(sizes.d).toEqual({ width: 200, height: 90 });
	});

	it("puts a titled corner cell where the two name strips meet", () => {
		const { headers } = layoutGrid(nodes(4), { columns: 2, cornerLabel: "Days x Exercise" });
		const corner = headers.find((h) => h.axis === "corner");
		expect(corner?.label).toBe("Days x Exercise");
		expect(corner!.x).toBeLessThan(0);
		expect(corner!.y).toBeLessThan(0);
	});

	it("does not draw columns that have no cell", () => {
		// A stored count of 3 columns with only one cell left.
		const { headers } = layoutGrid(nodes(1), { columns: 3 });
		expect(headers.filter((h) => h.axis === "column")).toHaveLength(1);
		expect(headers.filter((h) => h.axis === "row")).toHaveLength(1);
	});

	it("adds name cells above the columns and left of the rows", () => {
		const { headers } = layoutGrid(nodes(4), {
			columns: 2,
			rowLabels: ["Mon"],
			columnLabels: ["Task", "Owner"],
		});
		const column = headers.filter((h) => h.axis === "column");
		const row = headers.filter((h) => h.axis === "row");
		expect(column.map((h) => h.label)).toEqual(["Task", "Owner"]);
		expect(row.map((h) => h.label)).toEqual(["Mon", ""]);
		expect(column.every((h) => h.y < 0)).toBe(true);
		expect(row.every((h) => h.x < 0)).toBe(true);
		expect(column[1].x).toBeGreaterThan(column[0].x);
		expect(row[1].y).toBeGreaterThan(row[0].y);
	});
});

describe("layoutTree", () => {
	const list = nodes(5);
	const edges = [
		edge("e1", "n0", "n1"),
		edge("e2", "n0", "n2"),
		edge("e3", "n1", "n3"),
		edge("e4", "n3", "n0"), // back-edge: cross-link
		edge("e5", "n2", "n3"), // second parent: cross-link
	];

	it("puts the chosen root on top and centres parents over children", () => {
		const p = layoutTree(list, edges, "n0");
		expect(p.n0.y).toBe(0);
		expect(p.n1.y).toBe(p.n2.y);
		expect(p.n3.y).toBeGreaterThan(p.n1.y);
		expect(p.n0.x).toBe((p.n1.x + p.n2.x) / 2);
	});

	it("marks non-tree edges as cross-links", () => {
		const { crossLinks } = buildSpanningTree(list, edges, "n0");
		expect([...crossLinks].sort()).toEqual(["e4", "e5"]);
	});

	it("places nodes the root cannot reach", () => {
		const p = layoutTree(list, edges, "n0");
		expect(Object.keys(p).sort()).toEqual(["n0", "n1", "n2", "n3", "n4"]);
	});

	it("honours a different root and ignores an unknown one", () => {
		expect(layoutTree(list, edges, "n3").n3.y).toBe(0);
		expect(() => layoutTree(list, edges, "missing")).not.toThrow();
	});

	it("survives cycles, self-edges and a long chain", () => {
		const chain = nodes(5000);
		const links = chain.slice(1).map((n, i) => edge(`c${i}`, `n${i}`, n.id));
		links.push(edge("loop", "n4999", "n0"), edge("self", "n1", "n1"));
		const p = layoutTree(chain, links, "n0");
		expect(Object.keys(p)).toHaveLength(5000);
	});

	it("handles empty and single input", () => {
		expect(layoutTree([], [])).toEqual({});
		expect(layoutTree(nodes(1), [])).toEqual({ n0: { x: 0, y: 0 } });
	});
});

describe("layoutGraph", () => {
	const list = nodes(12);
	const edges = list.slice(1).map((n, i) => edge(`e${i}`, `n${i}`, n.id));

	it("is deterministic", () => {
		expect(layoutGraph(list, edges)).toEqual(layoutGraph(list, edges));
	});

	it("depends on the seed", () => {
		expect(layoutGraph(list, edges, { seed: 1 })).not.toEqual(
			layoutGraph(list, edges, { seed: 2 }),
		);
	});

	it("gives every node a finite position, including disconnected ones", () => {
		const p = layoutGraph(nodes(6), [edge("e", "n0", "n1")]);
		for (const point of Object.values(p)) {
			expect(Number.isFinite(point.x)).toBe(true);
			expect(Number.isFinite(point.y)).toBe(true);
		}
		expect(Object.keys(p)).toHaveLength(6);
	});

	it("keeps linked nodes closer than unlinked ones", () => {
		const p = layoutGraph(nodes(4), [edge("e", "n0", "n1")]);
		const d = (a: string, b: string) => Math.hypot(p[a].x - p[b].x, p[a].y - p[b].y);
		expect(d("n0", "n1")).toBeLessThan(d("n0", "n3"));
	});

	it("handles empty, single and unknown-edge input", () => {
		expect(layoutGraph([], [])).toEqual({});
		expect(layoutGraph(nodes(1), [edge("e", "n0", "ghost")])).toEqual({
			n0: { x: 0, y: 0 },
		});
	});
});

describe("computeLayout", () => {
	it("returns null for free mode", () => {
		expect(computeLayout("free", nodes(2), [])).toBeNull();
	});

	it("returns positions for every other mode", () => {
		for (const mode of ["tree", "graph", "grid"] as const) {
			expect(Object.keys(computeLayout(mode, nodes(3), [])?.positions ?? {})).toHaveLength(3);
		}
	});
});

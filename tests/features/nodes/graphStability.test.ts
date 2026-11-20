import { describe, expect, it } from "vitest";
import { layoutGraph } from "@src/features/nodes/lib/layout";
import { fromBoardNode, toBoardNode } from "@src/features/nodes/lib/serialize";
import type { BoardNode } from "@src/lib/db/types";

const box = (id: string) => ({ id, width: 200, height: 80 });
const link = (source: string, target: string) => ({ id: `${source}-${target}`, source, target });

describe("graph layout with unlinked nodes", () => {
	const linked = [box("a"), box("b"), box("c")];
	const edges = [link("a", "b"), link("b", "c")];

	it("leaves linked nodes where they were when an unlinked node is added", () => {
		const before = layoutGraph(linked, edges);
		const after = layoutGraph([...linked, box("new")], edges);
		for (const id of ["a", "b", "c"]) expect(after[id]).toEqual(before[id]);
	});

	it("parks unlinked nodes below the linked ones, without overlap", () => {
		const positions = layoutGraph([...linked, box("x"), box("y")], edges);
		const bottom = Math.max(...["a", "b", "c"].map((id) => positions[id].y + 80));
		expect(positions.x.y).toBeGreaterThanOrEqual(bottom);
		expect(positions.y.y).toBeGreaterThanOrEqual(bottom);
		expect(positions.x).not.toEqual(positions.y);
	});

	it("lays out a board with no links at all", () => {
		const positions = layoutGraph([box("x"), box("y"), box("z")], []);
		expect(Object.keys(positions).sort()).toEqual(["x", "y", "z"]);
		const spots = new Set(Object.values(positions).map((p) => `${p.x},${p.y}`));
		expect(spots.size).toBe(3);
	});
});

describe("dragged positions on graph and tree boards", () => {
	const node: BoardNode = {
		id: "n",
		type: "note",
		position: { x: 1, y: 2 },
		data: { color: "default" as never, pins: { graph: { x: 10, y: 20 }, tree: { x: 5, y: 6 } } },
	};

	it("survive a save and load", () => {
		expect(toBoardNode(fromBoardNode(node)).data.pins).toEqual({
			graph: { x: 10, y: 20 },
			tree: { x: 5, y: 6 },
		});
	});

	it("drop anything that is not a real position", () => {
		const bad = fromBoardNode({
			...node,
			data: { ...node.data, pins: { graph: { x: "a", y: 1 }, tree: null } as never },
		});
		expect(toBoardNode(bad).data.pins).toBeUndefined();
	});
});

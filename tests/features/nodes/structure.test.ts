import { describe, expect, it } from "vitest";
import {
	childrenOf,
	descendantsOf,
	indent,
	moveInList,
	moveSibling,
	moveToTarget,
	outdent,
	parentMap,
	reparent,
	treeRows,
	wouldCreateCycle,
} from "@src/features/nodes/lib/structure";

interface E {
	id: string;
	source: string;
	target: string;
}

const edge = (source: string, target: string): E => ({
	id: `${source}>${target}`,
	source,
	target,
});
const nodes = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
// a -> b, a -> c, c -> d ; e alone
const edges = [edge("a", "b"), edge("a", "c"), edge("c", "d")];

describe("tree queries", () => {
	it("finds parents, children and descendants", () => {
		expect(parentMap(edges).get("d")).toBe("c");
		expect(childrenOf(edges, "a")).toEqual(["b", "c"]);
		expect(descendantsOf(edges, "a")).toEqual(["b", "c", "d"]);
	});

	it("lists rows depth-first with depths", () => {
		expect(treeRows(nodes, edges)).toEqual([
			{ id: "a", depth: 0 },
			{ id: "b", depth: 1 },
			{ id: "c", depth: 1 },
			{ id: "d", depth: 2 },
			{ id: "e", depth: 0 },
		]);
	});

	it("detects loops", () => {
		expect(wouldCreateCycle(edges, "d", "a")).toBe(true);
		expect(wouldCreateCycle(edges, "a", "d")).toBe(false);
		expect(wouldCreateCycle(edges, "a", "a")).toBe(true);
	});
});

describe("reparent", () => {
	it("moves a node under a new parent and keeps a single parent", () => {
		const result = reparent(edges, "d", "b", edge);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(parentMap(result.edges).get("d")).toBe("b");
		expect(result.edges.filter((e) => e.target === "d")).toHaveLength(1);
	});

	it("rejects making a node a child of its own descendant or itself", () => {
		expect(reparent(edges, "a", "d", edge).ok).toBe(false);
		expect(reparent(edges, "a", "a", edge).ok).toBe(false);
	});

	it("moves to the top level with a null parent", () => {
		const result = reparent(edges, "c", null, edge);
		expect(result.ok && parentMap(result.edges).has("c")).toBe(false);
	});

	it("inserts at a given sibling index", () => {
		const result = reparent(edges, "e", "a", edge, 1);
		expect(result.ok && childrenOf(result.edges, "a")).toEqual(["b", "e", "c"]);
	});
});

describe("indent, outdent and moving", () => {
	it("indents under the sibling above and refuses for the first sibling", () => {
		const rows = treeRows(nodes, edges);
		const ok = indent(edges, "c", edge, rows);
		expect(ok.ok && parentMap(ok.edges).get("c")).toBe("b");
		expect(indent(edges, "b", edge, rows).ok).toBe(false);
	});

	it("outdents to sit right after the former parent", () => {
		const result = outdent(edges, "d", edge);
		expect(result.ok && parentMap(result.edges).get("d")).toBe("a");
		expect(result.ok && childrenOf(result.edges, "a")).toEqual(["b", "c", "d"]);
		expect(outdent(edges, "a", edge).ok).toBe(false);
	});

	it("swaps siblings", () => {
		expect(childrenOf(moveSibling(edges, "c", -1), "a")).toEqual(["c", "b"]);
		expect(childrenOf(moveSibling(edges, "b", -1), "a")).toEqual(["b", "c"]);
	});

	it("reorders a flat list", () => {
		expect(moveInList(nodes, "b", 1).map((n) => n.id)).toEqual(["a", "c", "b", "d", "e"]);
		expect(moveInList(nodes, "a", -1).map((n) => n.id)).toEqual(["a", "b", "c", "d", "e"]);
		expect(moveToTarget(nodes, "e", "b").map((n) => n.id)).toEqual(["a", "e", "b", "c", "d"]);
	});
});

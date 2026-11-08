import { describe, expect, it } from "vitest";
import { labelOf, parseOutline, serializeOutline } from "@src/features/nodes/lib/outline";
import type { BoardEdge, BoardNode } from "@src/lib/db/types";

let counter = 0;
const ids = () => `new${++counter}`;
const empty = { nodes: [], edges: [] };

const node = (id: string, label: string, x = 0, y = 0): BoardNode => ({
	id,
	type: "shape",
	position: { x, y },
	data: { color: "cyan", shape: "rounded", text: label },
});

const labels = (text: string, existing = empty) => {
	const r = parseOutline(text, existing, ids);
	return r.graph?.nodes.map(labelOf);
};

describe("parseOutline", () => {
	it("creates nodes and edges from lines", () => {
		const r = parseOutline("A -> B, C\nB -> C", empty, ids);
		expect(r.errors).toEqual([]);
		expect(r.graph?.nodes.map(labelOf)).toEqual(["A", "B", "C"]);
		const byId = new Map(r.graph?.nodes.map((n) => [n.id, labelOf(n)]));
		expect(r.graph?.edges.map((e) => `${byId.get(e.source)}>${byId.get(e.target)}`)).toEqual([
			"A>B",
			"A>C",
			"B>C",
		]);
	});

	it("creates unknown targets as nodes and ignores blank lines and whitespace", () => {
		expect(labels("\n  A  ->  B  \n\n")).toEqual(["A", "B"]);
	});

	it("allows a line with no arrow or no targets", () => {
		const r = parseOutline("Solo\nLone ->", empty, ids);
		expect(r.errors).toEqual([]);
		expect(r.graph?.nodes).toHaveLength(2);
		expect(r.graph?.edges).toHaveLength(0);
	});

	it("rejects a label defined twice, with line numbers", () => {
		const r = parseOutline("A -> B\nC\nA -> C", empty, ids);
		expect(r.graph).toBeNull();
		expect(r.errors).toEqual([{ line: 3, message: '"A" is already defined on line 1' }]);
	});

	it("allows a label to be a target on many lines", () => {
		expect(labels("A -> C\nB -> C")).toEqual(["A", "C", "B"]);
	});

	it("drops self-links with a warning", () => {
		const r = parseOutline("A -> A, B", empty, ids);
		expect(r.errors).toEqual([]);
		expect(r.warnings).toEqual([{ line: 1, message: 'Self-link on "A" was ignored' }]);
		expect(r.graph?.edges).toHaveLength(1);
	});

	it("merges a target repeated on one line with a warning", () => {
		const r = parseOutline("A -> B, B", empty, ids);
		expect(r.warnings).toHaveLength(1);
		expect(r.graph?.edges).toHaveLength(1);
	});

	it("reports every error with its line and applies nothing", () => {
		const r = parseOutline("-> B\nA -> B, , C\nOk\nX -> Y -> Z", empty, ids);
		expect(r.graph).toBeNull();
		expect(r.errors.map((e) => e.line)).toEqual([1, 2, 4]);
	});

	it("handles Windows line endings", () => {
		expect(labels("A -> B\r\nC")).toEqual(["A", "B", "C"]);
	});

	describe("stable ids", () => {
		const existing = {
			nodes: [node("id-a", "A", 10, 20), node("id-b", "B", 300, 20)],
			edges: [
				{
					id: "edge-ab",
					source: "id-a",
					target: "id-b",
					label: "to",
					arrow: true,
				},
			] as BoardEdge[],
		};

		it("keeps nodes, positions and edge details for unchanged labels", () => {
			const r = parseOutline("A -> B", existing, ids);
			expect(r.graph?.nodes.map((n) => n.id)).toEqual(["id-a", "id-b"]);
			expect(r.graph?.nodes[0].position).toEqual({ x: 10, y: 20 });
			expect(r.graph?.edges).toEqual([existing.edges[0]]);
		});

		it("keeps the node and its edges when a label is renamed", () => {
			const r = parseOutline("Alpha -> B", existing, ids);
			expect(r.graph?.nodes.map((n) => n.id)).toEqual(["id-a", "id-b"]);
			expect(labelOf(r.graph!.nodes[0])).toBe("Alpha");
			expect(r.graph?.edges[0].id).toBe("edge-ab");
		});

		it("keeps ids when lines are reordered", () => {
			const r = parseOutline("B\nA -> B", existing, ids);
			expect(new Set(r.graph?.nodes.map((n) => n.id))).toEqual(new Set(["id-a", "id-b"]));
		});

		it("does not give an existing node to two labels", () => {
			const r = parseOutline("New1\nA\nB", existing, ids);
			const used = r.graph?.nodes.map((n) => n.id) ?? [];
			expect(new Set(used).size).toBe(used.length);
			expect(used).toContain("id-a");
			expect(used).toContain("id-b");
		});

		it("drops nodes removed from the outline and places new ones below the rest", () => {
			const r = parseOutline("A\nB\nZ", existing, ids);
			expect(r.graph?.nodes.map(labelOf)).toEqual(["A", "B", "Z"]);
			expect(r.graph?.edges).toEqual([]);
			expect(r.graph!.nodes[2].position.y).toBeGreaterThan(20);
		});

		it("lets a new label take over the node of a removed one (rename by position)", () => {
			const r = parseOutline("A\nZ", existing, ids);
			expect(r.graph?.nodes.map((n) => n.id)).toEqual(["id-a", "id-b"]);
		});

		it("drops a node whose label is gone when nothing takes its place", () => {
			const r = parseOutline("A", existing, ids);
			expect(r.graph?.nodes.map((n) => n.id)).toEqual(["id-a"]);
		});

		it("sets a note title, not its text, when renamed", () => {
			const note: BoardNode = {
				id: "n",
				type: "note",
				position: { x: 0, y: 0 },
				data: { color: "cyan", title: "Old", text: "body" },
			};
			const r = parseOutline("New", { nodes: [note], edges: [] }, ids);
			expect(r.graph?.nodes[0].data).toMatchObject({
				title: "New",
				text: "body",
			});
		});
	});
});

describe("serializeOutline", () => {
	it("round-trips a board", () => {
		const text = "A -> B, C\nB -> C\nC";
		const first = parseOutline(text, empty, ids).graph!;
		expect(serializeOutline(first.nodes, first.edges)).toBe(text);
		const second = parseOutline(text, first, ids).graph!;
		expect(second.nodes.map((n) => n.id)).toEqual(first.nodes.map((n) => n.id));
		expect(second.edges.map((e) => e.id)).toEqual(first.edges.map((e) => e.id));
	});

	it("names blank nodes and de-duplicates labels so the text parses", () => {
		const nodes = [node("1", ""), node("2", "Same"), node("3", "Same")];
		const edges: BoardEdge[] = [{ id: "e", source: "1", target: "3" }];
		const text = serializeOutline(nodes, edges);
		expect(text).toBe("Untitled 1 -> Same (2)\nSame\nSame (2)");
		expect(parseOutline(text, empty, ids).errors).toEqual([]);
	});

	it("escapes characters the format reserves", () => {
		const text = serializeOutline([node("1", "a -> b, c")], []);
		expect(parseOutline(text, empty, ids).errors).toEqual([]);
	});
});

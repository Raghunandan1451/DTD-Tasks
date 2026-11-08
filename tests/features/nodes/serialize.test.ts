import { describe, expect, it } from "vitest";
import { MarkerType } from "@xyflow/react";
import {
	fromBoardEdge,
	fromBoardNode,
	toBoardEdge,
	toBoardNode,
	toBoardNodes,
	type FlowEdge,
	type FlowNode,
} from "@src/features/nodes/lib/serialize";
import { BOARD_TEXT_MAX } from "@src/lib/db/types";

/** A node as React Flow holds it at runtime, with everything that must not be saved. */
const runtimeNode = (): FlowNode =>
	({
		id: "n1",
		type: "note",
		position: { x: 10, y: 20 },
		width: 200,
		height: 120,
		data: { title: "Hi", text: "body", color: "cyan", extra: "leak" },
		selected: true,
		dragging: true,
		resizing: true,
		measured: { width: 200, height: 120 },
		positionAbsolute: { x: 10, y: 20 },
		internals: { z: 1 },
		style: { width: 200 },
		className: "x",
		draggable: true,
	}) as unknown as FlowNode;

describe("stripping runtime fields on save", () => {
	it("keeps only the stored node fields", () => {
		const stored = toBoardNode(runtimeNode());

		expect(Object.keys(stored).sort()).toEqual([
			"data",
			"height",
			"id",
			"position",
			"type",
			"width",
		]);
		expect(Object.keys(stored.data).sort()).toEqual(["color", "text", "title"]);
		expect(stored).toEqual({
			id: "n1",
			type: "note",
			position: { x: 10, y: 20 },
			width: 200,
			height: 120,
			data: { title: "Hi", text: "body", color: "cyan" },
		});
	});

	it("survives a structured clone, as IndexedDB requires", () => {
		const stored = toBoardNode(runtimeNode());
		expect(structuredClone(stored)).toEqual(stored);
		expect(JSON.parse(JSON.stringify(stored))).toEqual(stored);
	});

	it("keeps only the stored edge fields", () => {
		const edge = {
			id: "e1",
			source: "a",
			target: "b",
			type: "labeled",
			label: "links to",
			markerEnd: { type: MarkerType.ArrowClosed },
			selected: true,
			animated: false,
			style: { stroke: "red" },
		} as FlowEdge;

		expect(toBoardEdge(edge)).toEqual({
			id: "e1",
			source: "a",
			target: "b",
			label: "links to",
			arrow: true,
		});
	});

	it("leaves out empty optional fields instead of storing undefined", () => {
		const node: FlowNode = {
			id: "n2",
			type: "text",
			position: { x: 0, y: 0 },
			data: { color: "slate", title: undefined, text: undefined },
		};
		const stored = toBoardNode(node);

		expect(stored).toEqual({
			id: "n2",
			type: "text",
			position: { x: 0, y: 0 },
			data: { color: "slate" },
		});
		expect("title" in stored.data).toBe(false);
		expect(toBoardEdge({ id: "e", source: "a", target: "b", label: "" })).toEqual({
			id: "e",
			source: "a",
			target: "b",
		});
	});

	it("falls back to the default colour for an unknown palette key", () => {
		const node = runtimeNode();
		(node.data as { color: string }).color = "#ff00ff";
		expect(toBoardNode(node).data.color).toBe("slate");
	});

	it("limits text to 2000 characters", () => {
		const node = runtimeNode();
		node.data = { color: "slate", text: "x".repeat(BOARD_TEXT_MAX + 50) };
		expect(toBoardNode(node).data.text).toHaveLength(BOARD_TEXT_MAX);
	});

	it("ignores sizes that are not positive numbers", () => {
		const node = runtimeNode();
		node.width = 0;
		node.height = Number.NaN;
		const stored = toBoardNode(node);
		expect("width" in stored).toBe(false);
		expect("height" in stored).toBe(false);
	});

	it("maps a list of nodes", () => {
		expect(toBoardNodes([runtimeNode(), runtimeNode()])).toHaveLength(2);
	});
});

describe("rebuilding React Flow objects on load", () => {
	it("round-trips a node without gaining runtime fields", () => {
		const stored = toBoardNode(runtimeNode());
		const flow = fromBoardNode(stored);

		expect(flow.selected).toBeUndefined();
		expect(flow.dragging).toBeUndefined();
		expect(flow.measured).toBeUndefined();
		expect(toBoardNode(flow)).toEqual(stored);
	});

	it("omits width and height when they were never set", () => {
		const flow = fromBoardNode({
			id: "n",
			type: "text",
			position: { x: 1, y: 2 },
			data: { color: "rose" },
		});
		expect("width" in flow).toBe(false);
		expect("height" in flow).toBe(false);
	});

	it("rebuilds an edge with its label and arrow", () => {
		const flow = fromBoardEdge({
			id: "e1",
			source: "a",
			target: "b",
			label: "x",
			arrow: true,
		});

		expect(flow.type).toBe("labeled");
		expect(flow.label).toBe("x");
		expect(flow.markerEnd).toEqual({ type: MarkerType.ArrowClosed });
		expect(toBoardEdge(flow)).toEqual({
			id: "e1",
			source: "a",
			target: "b",
			label: "x",
			arrow: true,
		});
	});

	it("rebuilds an edge without an arrow when none was saved", () => {
		const flow = fromBoardEdge({ id: "e2", source: "a", target: "b" });
		expect(flow.markerEnd).toBeUndefined();
		expect(flow.label).toBeUndefined();
	});
});

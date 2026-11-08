import { act, renderHook } from "@testing-library/react";
import { ReactFlowProvider, type NodeChange } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";
import { useBoardEditor } from "@src/features/nodes/lib/useBoardEditor";
import type { FlowNode } from "@src/features/nodes/lib/serialize";
import { parseOutline } from "@src/features/nodes/lib/outline";
import type { Board } from "@src/lib/db/types";

const board: Board = {
	id: "b1",
	name: "Test",
	nodes: [
		{
			id: "a",
			type: "note",
			position: { x: 0, y: 0 },
			width: 200,
			height: 100,
			data: { color: "slate" },
		},
		{
			id: "b",
			type: "text",
			position: { x: 400, y: 0 },
			data: { color: "cyan", text: "hi" },
		},
	],
	edges: [],
	viewport: { x: 0, y: 0, zoom: 1 },
	createdAt: 1,
	updatedAt: 1,
};

const setup = () => {
	const onDirty = vi.fn();
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<ReactFlowProvider>{children}</ReactFlowProvider>
	);
	const view = renderHook(() => useBoardEditor({ board, onDirty }), {
		wrapper,
	});
	return { ...view, onDirty };
};

const positionOf = (nodes: FlowNode[], id: string) =>
	nodes.find((node) => node.id === id)?.position;

const move = (id: string, x: number, dragging: boolean): NodeChange<FlowNode> => ({
	type: "position",
	id,
	position: { x, y: 0 },
	dragging,
});

describe("undo with drag coalescing", () => {
	it("undoes a whole drag in one step", () => {
		const { result } = setup();

		act(() => {
			for (let x = 1; x <= 60; x++) result.current.onNodesChange([move("a", x, true)]);
			result.current.onNodesChange([move("a", 60, false)]);
			result.current.onNodeDragStop();
		});

		expect(positionOf(result.current.nodes, "a")).toEqual({ x: 60, y: 0 });
		expect(result.current.canUndo).toBe(true);

		act(() => result.current.undo());

		expect(positionOf(result.current.nodes, "a")).toEqual({ x: 0, y: 0 });
		expect(result.current.canUndo).toBe(false);
		expect(result.current.canRedo).toBe(true);

		act(() => result.current.redo());
		expect(positionOf(result.current.nodes, "a")).toEqual({ x: 60, y: 0 });
	});

	it("records nothing for a click that does not move the node", () => {
		const { result } = setup();

		act(() => {
			result.current.onNodesChange([{ type: "select", id: "a", selected: true }]);
			result.current.onNodeDragStop();
		});

		expect(result.current.canUndo).toBe(false);
	});

	it("treats a delete that also removes edges as one step", async () => {
		const { result } = setup();
		act(() =>
			result.current.onConnect({
				source: "a",
				target: "b",
				sourceHandle: null,
				targetHandle: null,
			}),
		);
		expect(result.current.edges).toHaveLength(1);
		act(() => result.current.undo());
		act(() => result.current.redo());

		// React Flow reports the node first, then the edges that went with it.
		await act(async () => {
			result.current.onNodesChange([{ type: "remove", id: "a" }]);
			result.current.onEdgesChange([{ type: "remove", id: result.current.edges[0].id }]);
			await Promise.resolve();
		});
		expect(result.current.nodes).toHaveLength(1);
		expect(result.current.edges).toHaveLength(0);

		act(() => result.current.undo());
		expect(result.current.nodes).toHaveLength(2);
		expect(result.current.edges).toHaveLength(1);
	});

	it("does not mark the board dirty for selection or plain measuring", () => {
		const { result, onDirty } = setup();

		act(() => {
			result.current.onNodesChange([
				{ type: "select", id: "a", selected: true },
				{
					type: "dimensions",
					id: "a",
					dimensions: { width: 200, height: 100 },
				},
			]);
		});

		expect(onDirty).not.toHaveBeenCalled();
	});

	it("marks the board dirty for a move", () => {
		const { result, onDirty } = setup();

		act(() => result.current.onNodesChange([move("a", 5, true)]));

		expect(onDirty).toHaveBeenCalledWith("content");
	});

	it("saves content without runtime fields", () => {
		const { result } = setup();
		act(() => result.current.onNodesChange([{ type: "select", id: "a", selected: true }]));

		const saved = result.current.getContent();

		expect(saved.nodes.every((node) => !("selected" in node))).toBe(true);
		expect(saved.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
	});
});

describe("viewport and editing", () => {
	it("reports a viewport change as viewport-only, and ignores an unchanged one", () => {
		const { result, onDirty } = setup();

		act(() => result.current.onMoveEnd(null, { x: 0, y: 0, zoom: 1 }));
		expect(onDirty).not.toHaveBeenCalled();

		act(() => result.current.onMoveEnd(null, { x: 10, y: 5, zoom: 2 }));
		expect(onDirty).toHaveBeenCalledWith("viewport");
		expect(result.current.getContent().viewport).toEqual({
			x: 10,
			y: 5,
			zoom: 2,
		});
		expect(result.current.canUndo).toBe(false);
	});

	it("adds, edits and undoes a node as separate steps", () => {
		const { result } = setup();

		let id = "";
		act(() => {
			id = result.current.addNode("shape", {
				position: { x: 32, y: 48 },
				shape: "diamond",
			});
		});
		expect(result.current.nodes).toHaveLength(3);
		expect(result.current.nodes.find((n) => n.id === id)?.data.shape).toBe("diamond");

		act(() => result.current.updateNodeData(id, { text: "Label" }));
		expect(result.current.nodes.find((n) => n.id === id)?.data.text).toBe("Label");

		act(() => result.current.undo());
		expect(result.current.nodes.find((n) => n.id === id)?.data.text).toBeUndefined();
		act(() => result.current.undo());
		expect(result.current.nodes).toHaveLength(2);
	});

	it("limits the undo stack to 50 steps", () => {
		const { result } = setup();

		act(() => {
			for (let i = 0; i < 60; i++) result.current.updateNodeData("b", { text: `v${i}` });
		});
		let undone = 0;
		while (result.current.canUndo && undone < 100) {
			act(() => result.current.undo());
			undone++;
		}

		expect(undone).toBe(50);
	});

	it("pastes copies with new ids and keeps edges between copied nodes", () => {
		const { result } = setup();
		act(() =>
			result.current.onConnect({
				source: "a",
				target: "b",
				sourceHandle: null,
				targetHandle: null,
			}),
		);
		act(() => {
			result.current.onNodesChange([
				{ type: "select", id: "a", selected: true },
				{ type: "select", id: "b", selected: true },
			]);
		});

		act(() => result.current.copy());
		act(() => result.current.paste());

		expect(result.current.nodes).toHaveLength(4);
		expect(result.current.edges).toHaveLength(2);
		const ids = new Set(result.current.nodes.map((n) => n.id));
		expect(ids.size).toBe(4);
		const pasted = result.current.nodes.filter((n) => n.selected);
		expect(pasted).toHaveLength(2);
		expect(positionOf(pasted, pasted.find((n) => n.type === "note")!.id)).toEqual({ x: 24, y: 24 });
	});
});

describe("layout mode and outline", () => {
	it("starts free and saves layout settings without touching node positions", () => {
		const { result, onDirty } = setup();
		expect(result.current.layoutMode).toBe("free");

		act(() => result.current.updateMeta({ layoutMode: "tree", treeRootId: "a" }));

		expect(onDirty).toHaveBeenCalledWith("content");
		expect(result.current.getContent()).toMatchObject({
			layoutMode: "tree",
			treeRootId: "a",
		});
		expect(positionOf(result.current.nodes, "b")).toEqual({ x: 400, y: 0 });
		// View settings are not undo steps.
		expect(result.current.canUndo).toBe(false);
	});

	it("applies an outline as one undo step", () => {
		const { result } = setup();
		const graph = parseOutline("a\nb\nc -> a", result.current.getGraph()).graph!;

		act(() => result.current.applyOutlineGraph(graph));
		expect(result.current.nodes).toHaveLength(3);
		expect(result.current.edges).toHaveLength(1);

		act(() => result.current.undo());
		expect(result.current.nodes).toHaveLength(2);
		expect(result.current.edges).toHaveLength(0);
	});

	it("clears the tree root when the outline removes that node", () => {
		const { result } = setup();
		act(() => result.current.updateMeta({ treeRootId: "b" }));
		const graph = parseOutline("a", result.current.getGraph()).graph!;
		act(() => result.current.applyOutlineGraph(graph));
		expect(result.current.treeRootId).toBeNull();
	});
});

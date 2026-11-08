import { act, renderHook } from "@testing-library/react";
import { ReactFlowProvider, type NodeChange } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";
import { useBoardEditor } from "@src/features/nodes/lib/useBoardEditor";
import type { FlowNode } from "@src/features/nodes/lib/serialize";
import type { Board, BoardLayoutMode } from "@src/lib/db/types";

const makeBoard = (layoutMode: BoardLayoutMode): Board => ({
	id: "b1",
	name: "Test",
	layoutMode,
	nodes: ["a", "b", "c", "d"].map((id, index) => ({
		id,
		type: "shape" as const,
		position: { x: index * 200, y: 0 },
		data: { color: "slate" as const, text: id, shape: "rounded" as const },
	})),
	// a -> b, a -> c, c -> d
	edges: [
		{ id: "ab", source: "a", target: "b", arrow: true },
		{ id: "ac", source: "a", target: "c", arrow: true },
		{ id: "cd", source: "c", target: "d", arrow: true },
	],
	viewport: { x: 0, y: 0, zoom: 1 },
	createdAt: 1,
	updatedAt: 1,
});

const setup = (mode: BoardLayoutMode) => {
	const onDirty = vi.fn();
	const onNotice = vi.fn();
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<ReactFlowProvider>{children}</ReactFlowProvider>
	);
	const view = renderHook(() => useBoardEditor({ board: makeBoard(mode), onDirty, onNotice }), {
		wrapper,
	});
	return { ...view, onDirty, onNotice };
};

const parentOf = (edges: { source: string; target: string }[], id: string) =>
	edges.find((edge) => edge.target === id)?.source;

describe("tree structure actions", () => {
	it("reparents as one undo step and keeps a single parent", () => {
		const { result } = setup("tree");
		act(() => result.current.reparentNode("d", "b"));

		expect(parentOf(result.current.edges, "d")).toBe("b");
		expect(result.current.edges.filter((edge) => edge.target === "d")).toHaveLength(1);

		act(() => result.current.undo());
		expect(parentOf(result.current.edges, "d")).toBe("c");
	});

	it("refuses a loop and says why", () => {
		const { result, onNotice } = setup("tree");
		act(() => result.current.reparentNode("a", "d"));

		expect(parentOf(result.current.edges, "a")).toBeUndefined();
		expect(onNotice).toHaveBeenCalledTimes(1);
		expect(result.current.canUndo).toBe(false);
	});

	it("moves a node under a second parent instead of adding a cross-link", () => {
		const { result } = setup("tree");
		act(() =>
			result.current.onConnect({
				source: "b",
				target: "d",
				sourceHandle: null,
				targetHandle: null,
			}),
		);

		expect(parentOf(result.current.edges, "d")).toBe("b");
		expect(result.current.edges).toHaveLength(3);
	});

	it("adds a child and a sibling in the right place", () => {
		const { result } = setup("tree");
		let child = "";
		act(() => {
			child = result.current.addChild("b");
		});
		expect(parentOf(result.current.edges, child)).toBe("b");

		let sibling = "";
		act(() => {
			sibling = result.current.addSibling("b");
		});
		const underA = result.current.edges.filter((edge) => edge.source === "a").map((e) => e.target);
		expect(underA).toEqual(["b", sibling, "c"]);
	});

	it("indents and outdents", () => {
		const { result } = setup("tree");
		act(() => result.current.indentNode("c"));
		expect(parentOf(result.current.edges, "c")).toBe("b");

		act(() => result.current.outdentNode("c"));
		expect(parentOf(result.current.edges, "c")).toBe("a");
	});

	it("deletes a subtree in one step", () => {
		const { result } = setup("tree");
		act(() => result.current.removeSubtree("c"));

		expect(result.current.nodes.map((node) => node.id)).toEqual(["a", "b"]);
		expect(result.current.edges.map((edge) => edge.id)).toEqual(["ab"]);

		act(() => result.current.undo());
		expect(result.current.nodes).toHaveLength(4);
	});

	it("ignores position changes, so a drag never overwrites saved positions", () => {
		const { result } = setup("tree");
		const change: NodeChange<FlowNode> = {
			type: "position",
			id: "a",
			position: { x: 999, y: 999 },
			dragging: true,
		};
		act(() => result.current.onNodesChange([change]));

		expect(result.current.nodes.find((n) => n.id === "a")?.position).toEqual({
			x: 0,
			y: 0,
		});
	});

	it("dropping a node on another reparents it", () => {
		const { result } = setup("tree");
		act(() => result.current.applyDrop("d", "b"));
		expect(parentOf(result.current.edges, "d")).toBe("b");
	});
});

describe("graph and grid actions", () => {
	it("links and unlinks without limiting parents", () => {
		const { result } = setup("graph");
		act(() => result.current.link("b", "d"));
		expect(result.current.edges.filter((edge) => edge.target === "d")).toHaveLength(2);

		act(() => result.current.unlink("b", "d"));
		expect(result.current.edges.filter((edge) => edge.target === "d")).toHaveLength(1);
	});

	it("a drop on another node links in a graph", () => {
		const { result } = setup("graph");
		act(() => result.current.applyDrop("b", "d"));
		expect(result.current.edges.some((e) => e.source === "b" && e.target === "d")).toBe(true);
	});

	it("reorders the node list and a grid drop moves a node to the target place", () => {
		const { result } = setup("grid");
		act(() => result.current.moveNode("a", 1));
		expect(result.current.nodes.map((n) => n.id)).toEqual(["b", "a", "c", "d"]);

		act(() => result.current.applyDrop("d", "b"));
		expect(result.current.nodes.map((n) => n.id)).toEqual(["d", "b", "a", "c"]);
	});

	it("sets the shape of selected shape nodes in one step", () => {
		const { result } = setup("graph");
		act(() => {
			result.current.selectOnly(["a", "b"]);
		});
		act(() => result.current.setSelectedShape("diamond"));

		const shapes = result.current.nodes.map((n) => n.data.shape);
		expect(shapes).toEqual(["diamond", "diamond", "rounded", "rounded"]);

		act(() => result.current.undo());
		expect(result.current.nodes.every((n) => n.data.shape === "rounded")).toBe(true);
	});
});

describe("free mode", () => {
	it("still saves positions from drags", () => {
		const { result } = setup("free");
		act(() =>
			result.current.onNodesChange([
				{
					type: "position",
					id: "a",
					position: { x: 50, y: 50 },
					dragging: false,
				},
			]),
		);
		expect(result.current.nodes.find((n) => n.id === "a")?.position).toEqual({
			x: 50,
			y: 50,
		});
	});
});

describe("grid rows and columns", () => {
	const gridBoard = (): Board => ({
		...makeBoard("grid"),
		nodes: makeBoard("grid").nodes.slice(0, 1),
		edges: [],
		gridColumns: 1,
	});

	const setupGrid = () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<ReactFlowProvider>{children}</ReactFlowProvider>
		);
		return renderHook(() => useBoardEditor({ board: gridBoard(), onDirty: vi.fn() }), { wrapper });
	};

	it("starts as 1 node in 1 column and grows by row and column, undoing both together", () => {
		const { result } = setupGrid();
		expect(result.current.nodes).toHaveLength(1);
		expect(result.current.gridColumns).toBe(1);

		act(() => result.current.addGridRow());
		expect(result.current.nodes).toHaveLength(2);

		act(() => result.current.addGridColumn());
		expect(result.current.gridColumns).toBe(2);
		expect(result.current.nodes).toHaveLength(4);
		expect(result.current.getContent().gridColumns).toBe(2);

		act(() => result.current.undo());
		expect(result.current.gridColumns).toBe(1);
		expect(result.current.nodes).toHaveLength(2);
	});

	it("removing a column drops its nodes and any links to them", () => {
		const { result } = setupGrid();
		act(() => result.current.addGridColumn()); // a, new
		const [first, second] = result.current.nodes.map((n) => n.id);
		act(() => result.current.link(first, second));
		expect(result.current.edges).toHaveLength(1);

		act(() => result.current.removeGridColumn(1));
		expect(result.current.nodes.map((n) => n.id)).toEqual([first]);
		expect(result.current.edges).toHaveLength(0);
		expect(result.current.gridColumns).toBe(1);
	});
});

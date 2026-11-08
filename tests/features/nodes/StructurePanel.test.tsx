import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StructurePanel, {
	type StructureActions,
} from "@src/features/nodes/components/StructurePanel";
import type { FlowEdge, FlowNode } from "@src/features/nodes/lib/serialize";

const node = (id: string, text: string, selected = false): FlowNode => ({
	id,
	type: "shape",
	position: { x: 0, y: 0 },
	selected,
	data: { color: "slate", text, shape: "rounded" },
});

const nodes = [node("a", "Root"), node("b", "Child"), node("c", "Other")];
const edges: FlowEdge[] = [{ id: "ab", source: "a", target: "b" }];

const makeActions = (): StructureActions => ({
	addNode: vi.fn(() => "new"),
	addChild: vi.fn(() => "new"),
	addSibling: vi.fn(() => "new"),
	updateNodeData: vi.fn(),
	setSelectedColor: vi.fn(),
	setSelectedShape: vi.fn(),
	updateEdge: vi.fn(),
	indentNode: vi.fn(),
	outdentNode: vi.fn(),
	moveNode: vi.fn(),
	link: vi.fn(),
	unlink: vi.fn(),
	removeNodes: vi.fn(),
	removeSubtree: vi.fn(),
	selectOnly: vi.fn(),
	applyOutlineGraph: vi.fn(),
	addGridRow: vi.fn(),
	addGridColumn: vi.fn(),
	removeGridRow: vi.fn(),
	removeGridColumn: vi.fn(),
});

const renderPanel = (mode: "tree" | "graph" | "grid", actions = makeActions(), list = nodes) => {
	render(
		<StructurePanel
			layoutMode={mode}
			nodes={list}
			edges={edges}
			treeRootId={null}
			gridColumns={1}
			onTreeRoot={vi.fn()}
			outline=""
			onOutlineChange={vi.fn()}
			actions={actions}
		/>,
	);
	return actions;
};

describe("StructurePanel", () => {
	it("shows one row per node and adds a root node from the header", () => {
		const actions = renderPanel("tree");
		expect(screen.getAllByLabelText("Node label")).toHaveLength(3);

		fireEvent.click(screen.getByTitle("Add shape"));
		expect(actions.addNode).toHaveBeenCalledWith("shape", { shape: "rounded" });
	});

	it("adds the new node under the selected node in a tree", () => {
		const actions = renderPanel("tree", makeActions(), [
			node("a", "Root", true),
			node("b", "Child"),
		]);
		fireEvent.click(screen.getByTitle("Add shape"));
		expect(actions.addChild).toHaveBeenCalledWith("a", "shape", {
			shape: "rounded",
		});
	});

	it("tree keys: Enter adds a sibling, Tab indents, Shift+Tab outdents", () => {
		const actions = renderPanel("tree");
		const input = screen.getAllByLabelText("Node label")[1];

		fireEvent.keyDown(input, { key: "Enter" });
		expect(actions.addSibling).toHaveBeenCalledWith("b");

		fireEvent.keyDown(input, { key: "Tab" });
		expect(actions.indentNode).toHaveBeenCalledWith("b");

		fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
		expect(actions.outdentNode).toHaveBeenCalledWith("b");
	});

	it("saves a label edit on blur", () => {
		const actions = renderPanel("graph");
		const input = screen.getAllByLabelText("Node label")[0];
		fireEvent.change(input, { target: { value: "Renamed" } });
		fireEvent.blur(input);
		expect(actions.updateNodeData).toHaveBeenCalledWith("a", {
			text: "Renamed",
		});
	});

	it("graph rows can link to another node and remove a link", () => {
		const actions = renderPanel("graph");
		const pickers = screen.getAllByLabelText("Link to");
		fireEvent.change(pickers[0], { target: { value: "c" } });
		expect(actions.link).toHaveBeenCalledWith("a", "c");

		fireEvent.click(screen.getByLabelText("Remove link to Child"));
		expect(actions.unlink).toHaveBeenCalledWith("a", "b");
	});

	it("grid rows have no link picker or indent controls", () => {
		renderPanel("grid");
		expect(screen.queryByLabelText("Link to")).toBeNull();
		expect(screen.queryByLabelText("Indent")).toBeNull();
		expect(screen.getAllByLabelText("Move down").length).toBeGreaterThan(0);
	});

	it("deleting a node with children asks first, and deleting a leaf does not", () => {
		const actions = renderPanel("tree");
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

		const deletes = screen.getAllByLabelText("Delete node");
		fireEvent.click(deletes[0]); // "Root" has a child
		expect(confirm).toHaveBeenCalled();
		expect(actions.removeSubtree).toHaveBeenCalledWith("a");

		confirm.mockClear();
		fireEvent.click(deletes[1]); // "Child" is a leaf
		expect(confirm).not.toHaveBeenCalled();
		expect(actions.removeNodes).toHaveBeenCalledWith(["b"]);
		confirm.mockRestore();
	});
});

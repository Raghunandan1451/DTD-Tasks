import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
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
			gridRowLabels={[]}
			gridColumnLabels={[]}
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

const note = (id: string, title: string, text = "", selected = false): FlowNode => ({
	id,
	type: "note",
	position: { x: 0, y: 0 },
	selected,
	data: { color: "slate", title, text },
});

describe("StructurePanel note description", () => {
	const noteList = [note("n1", "Plan", "first idea"), node("s1", "Shape one")];

	it("only note rows have a description field", () => {
		renderPanel("graph", makeActions(), noteList);
		const fields = screen.getAllByLabelText("Node description");
		expect(fields).toHaveLength(1);
		expect(fields[0]).toHaveValue("first idea");
		expect(screen.getAllByLabelText("Node label")).toHaveLength(2);
	});

	it("saves the description on blur and leaves the title alone", () => {
		const actions = renderPanel("graph", makeActions(), noteList);
		const field = screen.getByLabelText("Node description");
		fireEvent.change(field, { target: { value: "second idea" } });
		fireEvent.blur(field);
		expect(actions.updateNodeData).toHaveBeenCalledTimes(1);
		expect(actions.updateNodeData).toHaveBeenCalledWith("n1", { text: "second idea" });
	});

	it("the title of a note still saves as its title", () => {
		const actions = renderPanel("graph", makeActions(), noteList);
		const title = screen.getAllByLabelText("Node label")[0];
		fireEvent.change(title, { target: { value: "New plan" } });
		fireEvent.blur(title);
		expect(actions.updateNodeData).toHaveBeenCalledWith("n1", { title: "New plan" });
	});

	it("does not save when nothing changed, and cuts text at the limit", () => {
		const actions = renderPanel("graph", makeActions(), noteList);
		const field = screen.getByLabelText("Node description");
		fireEvent.blur(field);
		expect(actions.updateNodeData).not.toHaveBeenCalled();
		expect(field).toHaveAttribute("maxLength", "2000");

		fireEvent.change(field, { target: { value: "x".repeat(2500) } });
		fireEvent.blur(field);
		expect(actions.updateNodeData).toHaveBeenCalledWith("n1", { text: "x".repeat(2000) });
	});

	it("Enter is a new line, not a tree shortcut; Escape puts the saved text back", () => {
		const actions = renderPanel("tree", makeActions(), noteList);
		const field = screen.getByLabelText("Node description");

		fireEvent.keyDown(field, { key: "Enter" });
		fireEvent.keyDown(field, { key: "Tab" });
		expect(actions.addSibling).not.toHaveBeenCalled();
		expect(actions.indentNode).not.toHaveBeenCalled();

		fireEvent.change(field, { target: { value: "scrapped" } });
		fireEvent.keyDown(field, { key: "Escape" });
		expect(field).toHaveValue("first idea");
		expect(actions.updateNodeData).not.toHaveBeenCalled();
	});

	it("is one line when the row is not selected and three when it is", () => {
		renderPanel("graph", makeActions(), [note("n1", "Plan", "x"), note("n2", "Other", "y", true)]);
		const [first, second] = screen.getAllByLabelText("Node description");
		expect(first).toHaveAttribute("rows", "1");
		expect(second).toHaveAttribute("rows", "3");
	});
});

describe("StructurePanel row layout", () => {
	it("keeps the Shape picker beside the label, in a wrapping row", () => {
		renderPanel("graph");
		const row = screen.getAllByRole("listitem")[0];
		const label = within(row).getByLabelText("Node label");
		const shape = within(row).getByLabelText("Shape");

		expect(shape.parentElement).toBe(label.parentElement);
		expect(label.parentElement).toHaveClass("flex-wrap");
		expect(within(row).queryByLabelText("Link to")).not.toBe(shape);
	});

	it("puts Link to and the link chips on the button row, after the buttons", () => {
		renderPanel("graph");
		const row = screen.getAllByRole("listitem")[0]; // "Root" links to "Child"
		const buttons = within(row).getByLabelText("Delete node").parentElement!;
		const link = within(row).getByLabelText("Link to");
		const chip = within(row).getByLabelText("Remove link to Child");

		// One group, pushed to the right end of the row with a gap before it.
		const group = link.parentElement!;
		expect(group.parentElement).toBe(buttons);
		expect(group).toHaveClass("ml-auto");
		expect(chip.closest("span")!.parentElement).toBe(group);
		expect(buttons).toHaveClass("flex-wrap");
		// Order: the buttons first, then the group (picker before chips).
		expect([...buttons.children].indexOf(group)).toBeGreaterThan(
			[...buttons.children].indexOf(within(row).getByLabelText("Delete node")),
		);
		expect([...group.children].indexOf(link)).toBeLessThan(
			[...group.children].indexOf(chip.closest("span")!),
		);
	});

	it("has no separate link row any more", () => {
		renderPanel("graph");
		const row = screen.getAllByRole("listitem")[0];
		// label row, button row; nothing else holds links.
		expect(row.querySelectorAll(":scope > div")).toHaveLength(2);
	});

	it("puts the new-shape picker on the add-buttons row, after Text", () => {
		renderPanel("graph");
		const buttons = screen.getByTitle("Add text").parentElement!;
		const picker = document.getElementById("panel-shape")!;

		expect(picker.closest("div")!.parentElement).toBe(buttons);
		expect(buttons).toHaveClass("flex-wrap");
		expect([...buttons.children].at(-1)).toBe(picker.closest("div"));
		// Pushed to the right end of the row.
		expect(picker.closest("div")).toHaveClass("ml-auto");
	});

	it("shows no picker for a note in a tree", () => {
		renderPanel("tree", makeActions(), [note("n1", "Plan")]);
		const row = screen.getAllByRole("listitem")[0];
		expect(within(row).queryByLabelText("Shape")).toBeNull();
		expect(within(row).queryByLabelText("Link to")).toBeNull();
	});
});

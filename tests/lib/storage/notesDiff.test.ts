import { describe, expect, it } from "vitest";
import { diffNotesTree, type NotesOp } from "@src/lib/storage/notesDiff";
import type { File, Folder } from "@src/features/markdown/type";

const file = (id: string, path: string, content = ""): File => ({
	id,
	path,
	type: "file",
	content,
});
const folder = (id: string, path: string, children: (File | Folder)[] = []): Folder => ({
	id,
	path,
	type: "folder",
	children,
});

describe("diffNotesTree", () => {
	it("returns nothing when the trees are the same", () => {
		const tree = [folder("d", "docs", [file("a", "a.md", "x")]), file("b", "b.md")];
		expect(diffNotesTree(tree, structuredClone(tree))).toEqual([]);
	});

	it("creates a file with its content", () => {
		expect(diffNotesTree([], [file("a", "a.md", "hi")])).toEqual([
			{ type: "create", id: "a", kind: "file", path: "a.md", content: "hi" },
		]);
	});

	it("creates a new folder before the files inside it", () => {
		const ops = diffNotesTree([], [folder("d", "docs", [file("a", "a.md", "x")])]);
		expect(ops).toEqual([
			{ type: "create", id: "d", kind: "folder", path: "docs" },
			{ type: "create", id: "a", kind: "file", path: "docs/a.md", content: "x" },
		]);
	});

	it("writes a file whose content changed, and nothing else", () => {
		const ops = diffNotesTree(
			[folder("d", "docs", [file("a", "a.md", "old")])],
			[folder("d", "docs", [file("a", "a.md", "new")])],
		);
		expect(ops).toEqual([{ type: "write", id: "a", path: "docs/a.md", content: "new" }]);
	});

	it("renames a file by id instead of deleting and creating it", () => {
		const ops = diffNotesTree([file("a", "old.md", "x")], [file("a", "new.md", "x")]);
		expect(ops).toEqual([
			{ type: "rename", id: "a", kind: "file", from: "old.md", to: "new.md" },
		]);
	});

	it("renames a folder as one step without repeating its contents", () => {
		const ops = diffNotesTree(
			[folder("d", "old", [file("a", "a.md", "x"), file("b", "b.md")])],
			[folder("d", "new", [file("a", "a.md", "x"), file("b", "b.md")])],
		);
		expect(ops).toEqual([
			{ type: "rename", id: "d", kind: "folder", from: "old", to: "new" },
		]);
	});

	it("uses the new location when a renamed folder also has a renamed child", () => {
		const ops = diffNotesTree(
			[folder("d", "A", [file("x", "x.md", "1")])],
			[folder("d", "B", [file("x", "y.md", "1")])],
		);
		expect(ops).toEqual([
			{ type: "rename", id: "d", kind: "folder", from: "A", to: "B" },
			{ type: "rename", id: "x", kind: "file", from: "B/x.md", to: "B/y.md" },
		]);
	});

	it("writes at the new path when a file is renamed and edited together", () => {
		const ops = diffNotesTree([file("a", "a.md", "old")], [file("a", "b.md", "new")]);
		expect(ops).toEqual([
			{ type: "rename", id: "a", kind: "file", from: "a.md", to: "b.md" },
			{ type: "write", id: "a", path: "b.md", content: "new" },
		]);
	});

	it("moves a file into a folder", () => {
		const ops = diffNotesTree(
			[file("a", "a.md", "x"), folder("d", "docs")],
			[folder("d", "docs", [file("a", "a.md", "x")])],
		);
		expect(ops).toEqual([
			{ type: "move", id: "a", kind: "file", from: "a.md", to: "docs/a.md" },
		]);
	});

	it("creates the target folder before moving a file into it", () => {
		const ops = diffNotesTree(
			[file("a", "a.md", "x")],
			[folder("d", "new", [file("a", "a.md", "x")])],
		);
		expect(ops).toEqual([
			{ type: "create", id: "d", kind: "folder", path: "new" },
			{ type: "move", id: "a", kind: "file", from: "a.md", to: "new/a.md" },
		]);
	});

	it("removes a folder as one step, not once per file inside", () => {
		const ops = diffNotesTree(
			[folder("d", "docs", [file("a", "a.md"), folder("e", "deep", [file("b", "b.md")])])],
			[],
		);
		expect(ops).toEqual([{ type: "remove", id: "d", kind: "folder", path: "docs" }]);
	});

	it("moves a file out of a folder before that folder is removed", () => {
		const ops = diffNotesTree(
			[folder("d", "docs", [file("a", "a.md", "keep")])],
			[file("a", "a.md", "keep")],
		);
		expect(ops).toEqual([
			{ type: "move", id: "a", kind: "file", from: "docs/a.md", to: "a.md" },
			{ type: "remove", id: "d", kind: "folder", path: "docs" },
		]);
	});

	it("lets a create reuse a name that a rename freed in the same batch", () => {
		const ops = diffNotesTree(
			[file("a", "note.md", "old")],
			[file("a", "renamed.md", "old"), file("b", "note.md", "fresh")],
		);
		expect(ops).toEqual([
			{ type: "rename", id: "a", kind: "file", from: "note.md", to: "renamed.md" },
			{ type: "create", id: "b", kind: "file", path: "note.md", content: "fresh" },
		]);
	});

	it("handles a delete and a create of the same name as remove then create", () => {
		const ops = diffNotesTree([file("a", "note.md", "old")], [file("b", "note.md", "new")]);
		expect(ops).toEqual([
			{ type: "remove", id: "a", kind: "file", path: "note.md" },
			{ type: "create", id: "b", kind: "file", path: "note.md", content: "new" },
		]);
	});

	it("emits every step even when two items swap names (cannot be ordered safely)", () => {
		const ops = diffNotesTree(
			[file("a", "x.md", "1"), file("b", "y.md", "2")],
			[file("a", "y.md", "1"), file("b", "x.md", "2")],
		);
		expect(ops.filter((o: NotesOp) => o.type === "rename")).toHaveLength(2);
	});

	it("does not hang when best-effort steps would form a loop", () => {
		// P is inside X now; afterwards X is inside P, but both want names the other holds.
		const ops = diffNotesTree(
			[folder("x", "a", [folder("p", "b")]), folder("q", "b")],
			[folder("p", "a", [folder("x", "b")]), folder("q", "c")],
		);
		expect(ops.length).toBeGreaterThan(0);
	});
});

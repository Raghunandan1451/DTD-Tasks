import { describe, expect, it } from "vitest";
import { diffMarkdownTrees } from "@src/features/markdown/lib/markdownChanges";
import type { File, Folder } from "@src/features/markdown/type";

const file = (id: string, path: string, content = ""): File => ({
	id,
	path,
	type: "file",
	content,
});
const folder = (id: string, path: string, children: (File | Folder)[]): Folder => ({
	id,
	path,
	type: "folder",
	children,
});

describe("diffMarkdownTrees", () => {
	it("reports nothing for identical trees", () => {
		const tree = [folder("d", "Notes", [file("f", "a.md", "x")])];
		expect(diffMarkdownTrees(tree, tree)).toEqual([]);
	});

	it("reports created files and folders with their full path", () => {
		const changes = diffMarkdownTrees(
			[],
			[folder("d", "Notes", [file("f", "Idea.md")])],
		);
		expect(changes).toEqual([
			{ fileId: "d", name: "Notes", action: "created", meta: { isFolder: true } },
			{ fileId: "f", name: "Notes/Idea.md", action: "created", meta: undefined },
		]);
	});

	it("reports an edit when content changes", () => {
		const changes = diffMarkdownTrees(
			[file("f", "a.md", "old")],
			[file("f", "a.md", "new")],
		);
		expect(changes).toEqual([{ fileId: "f", name: "a.md", action: "edited" }]);
	});

	it("reports a rename with the old full path", () => {
		const changes = diffMarkdownTrees(
			[folder("d", "Notes", [file("f", "Idea.md")])],
			[folder("d", "Notes", [file("f", "Plan.md")])],
		);
		expect(changes).toEqual([
			{
				fileId: "f",
				name: "Notes/Plan.md",
				action: "renamed",
				meta: { oldName: "Notes/Idea.md" },
			},
		]);
	});

	it("reports only the folder when a folder is renamed", () => {
		const changes = diffMarkdownTrees(
			[folder("d", "Old", [file("f", "a.md")])],
			[folder("d", "New", [file("f", "a.md")])],
		);
		expect(changes).toEqual([
			{
				fileId: "d",
				name: "New",
				action: "renamed",
				meta: { oldName: "Old", isFolder: true },
			},
		]);
	});

	it("reports rename and edit separately when both happen", () => {
		const changes = diffMarkdownTrees(
			[file("f", "a.md", "1")],
			[file("f", "b.md", "2")],
		);
		expect(changes.map((c) => c.action).sort()).toEqual(["edited", "renamed"]);
	});

	it("reports deletions using the name the item had", () => {
		const changes = diffMarkdownTrees(
			[folder("d", "Notes", [file("f", "Idea.md")]), file("k", "keep.md")],
			[file("k", "keep.md")],
		);
		expect(changes).toEqual([
			{ fileId: "d", name: "Notes", action: "deleted", meta: { isFolder: true } },
			{ fileId: "f", name: "Notes/Idea.md", action: "deleted", meta: undefined },
		]);
	});
});

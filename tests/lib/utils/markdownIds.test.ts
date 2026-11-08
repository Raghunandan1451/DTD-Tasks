import { describe, expect, it } from "vitest";
import {
	collectItemIds,
	findPathById,
} from "@src/lib/utils/markdownIds";
import type { File, Folder } from "@src/features/markdown/type";

const file = (id: string, path: string): File => ({ id, path, type: "file", content: "" });
const folder = (id: string, path: string, children: (File | Folder)[]): Folder => ({
	id,
	path,
	type: "folder",
	children,
});

const tree = [
	file("root", "Readme.md"),
	folder("d1", "Notes", [file("f1", "Idea.md"), folder("d2", "Deep", [file("f2", "x.md")])]),
];

describe("findPathById", () => {
	it("returns the current full path of files and folders at any depth", () => {
		expect(findPathById(tree, "root")).toBe("Readme.md");
		expect(findPathById(tree, "f1")).toBe("Notes/Idea.md");
		expect(findPathById(tree, "d2")).toBe("Notes/Deep");
		expect(findPathById(tree, "f2")).toBe("Notes/Deep/x.md");
	});

	it("returns null for an id that no longer exists", () => {
		expect(findPathById(tree, "gone")).toBeNull();
		expect(findPathById([], "root")).toBeNull();
	});
});

describe("collectItemIds", () => {
	it("collects every file and folder id", () => {
		expect([...collectItemIds(tree)].sort()).toEqual(["d1", "d2", "f1", "f2", "root"]);
	});
});

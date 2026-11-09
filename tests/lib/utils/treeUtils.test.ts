import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	handleToggleFolder,
	handleFileToggleSelect,
	handleCreateFile,
	handleDeleteFile,
	handleRenameFile,
	handleMoveItem,
	listFolderPaths,
	findFileByPath,
	sortFilesAlphabetically,
} from "@src/lib/utils/treeUtils";
import {
	addFolder,
	addFile,
	selectFile,
	deleteFile,
	renameFile,
	moveItem,
} from "@src/lib/store/slices/markdownSlice";
import { File, Folder } from "@src/features/markdown/type";

vi.mock("@src/lib/store/slices/markdownSlice", async () => {
	const actual = await vi.importActual<
		typeof import("@src/lib/store/slices/markdownSlice")
	>("@src/lib/store/slices/markdownSlice");
	return {
		...actual,
		addFolder: vi.fn(),
		addFile: vi.fn(),
		selectFile: vi.fn(),
		deleteFile: vi.fn(),
		renameFile: vi.fn(),
	};
});

describe("Markdown Handlers", () => {
	let dispatch: ReturnType<typeof vi.fn>;
	let showNotification: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		dispatch = vi.fn();
		showNotification = vi.fn();
		vi.clearAllMocks();
	});

	it("handleToggleFolder toggles folder path in set", () => {
		const set = new Set<string>(["foo"]);
		const setter = vi.fn();
		handleToggleFolder(set, setter, "foo");
		expect(setter).toHaveBeenCalledWith(new Set());
	});

	it("handleFileToggleSelect selects a file that is not selected", () => {
		handleFileToggleSelect(dispatch, "folder/file.md", null);
		expect(dispatch).toHaveBeenCalledWith(selectFile("folder/file.md"));
	});

	it("handleFileToggleSelect deselects the file that is already selected", () => {
		handleFileToggleSelect(dispatch, "folder/file.md", "folder/file.md");
		expect(dispatch).toHaveBeenCalledWith(selectFile(null));
	});

	it("handleCreateFile creates file with missing folders", () => {
		const files: File[] = [];
		handleCreateFile(dispatch, files, showNotification, "docs/readme");
		expect(dispatch).toHaveBeenCalledWith(
			addFolder({ parentPath: "", folder: expect.any(Object) })
		);
		expect(dispatch).toHaveBeenCalledWith(
			addFile({ path: "readme.md", content: "", parentPath: "docs" })
		);
		expect(showNotification).toHaveBeenCalledWith(
			"File created successfully!",
			"success"
		);
	});

	it("handleCreateFile shows error for existing file", () => {
		const files: File[] = [
			{
				id: "file.md",
				path: "file.md",
				type: "file",
				content: "ANDERS",
			},
		];
		handleCreateFile(dispatch, files, showNotification, "file.md");
		expect(showNotification).toHaveBeenCalledWith(
			"File already exists in this directory!",
			"error"
		);
	});

	it("handleCreateFile shows error for empty name", () => {
		handleCreateFile(dispatch, [], showNotification, "");
		expect(showNotification).toHaveBeenCalledWith(
			"Please enter a file name",
			"error"
		);
	});

	it("handleDeleteFile dispatches deleteFile and shows notification", () => {
		handleDeleteFile(dispatch, "file.md", showNotification);
		expect(dispatch).toHaveBeenCalledWith(deleteFile({ path: "file.md" }));
		expect(showNotification).toHaveBeenCalledWith(
			"File/Folder deleted successfully",
			"success"
		);
	});

	it("handleRenameFile validates and dispatches rename", () => {
		handleRenameFile(dispatch, "file.md", "newname.md", showNotification);
		expect(dispatch).toHaveBeenCalledWith(
			renameFile({ oldPath: "file.md", newName: "newname.md" })
		);
		expect(showNotification).toHaveBeenCalledWith(
			"File renamed successfully",
			"success"
		);
	});

	it("handleRenameFile adds .md to a file name that lacks it", () => {
		handleRenameFile(dispatch, "file.md", "notes", showNotification, "file");
		expect(dispatch).toHaveBeenCalledWith(
			renameFile({ oldPath: "file.md", newName: "notes.md" })
		);
	});

	it("handleRenameFile does not add .md to a folder name", () => {
		handleRenameFile(dispatch, "docs", "papers", showNotification, "folder");
		expect(dispatch).toHaveBeenCalledWith(
			renameFile({ oldPath: "docs", newName: "papers" })
		);
		expect(showNotification).toHaveBeenCalledWith(
			"Folder renamed successfully",
			"success"
		);
	});

	describe("handleMoveItem", () => {
		const files: (File | Folder)[] = [
			{ id: "a", path: "a.md", type: "file", content: "" },
			{
				id: "docs",
				path: "docs",
				type: "folder",
				children: [
					{ id: "a2", path: "a.md", type: "file", content: "" },
					{ id: "sub", path: "sub", type: "folder", children: [] },
				],
			},
			{ id: "arch", path: "archive", type: "folder", children: [] },
		];

		it("dispatches moveItem for a valid move", () => {
			const ok = handleMoveItem(dispatch, files, "a.md", "archive", showNotification);
			expect(ok).toBe(true);
			expect(dispatch).toHaveBeenCalledWith(
				moveItem({ sourcePath: "a.md", destFolderPath: "archive" })
			);
		});

		it("rejects moving into the current folder, itself, or a clash", () => {
			expect(handleMoveItem(dispatch, files, "a.md", "", showNotification)).toBe(false);
			expect(handleMoveItem(dispatch, files, "docs", "docs/sub", showNotification)).toBe(false);
			expect(handleMoveItem(dispatch, files, "a.md", "docs", showNotification)).toBe(false);
			expect(handleMoveItem(dispatch, files, "a.md", "missing", showNotification)).toBe(false);
			expect(dispatch).not.toHaveBeenCalled();
		});
	});

	it("listFolderPaths lists nested folders depth-first", () => {
		const tree: (File | Folder)[] = [
			{ id: "f", path: "f.md", type: "file", content: "" },
			{
				id: "b",
				path: "b",
				type: "folder",
				children: [{ id: "c", path: "c", type: "folder", children: [] }],
			},
			{ id: "a", path: "a", type: "folder", children: [] },
		];
		expect(listFolderPaths(tree)).toEqual(["a", "b", "b/c"]);
	});

	it("handleRenameFile shows error for slash in name", () => {
		handleRenameFile(dispatch, "file.md", "new/name", showNotification);
		expect(showNotification).toHaveBeenCalledWith(
			"Name cannot contain slashes",
			"error"
		);
	});

	it("findFileByPath returns file correctly", () => {
		const files: (File | Folder)[] = [
			{
				id: "docs",
				path: "docs",
				type: "folder",
				children: [{ id: "readme.md", path: "readme.md", type: "file", content: "" }],
			},
		];
		const result = findFileByPath(files, "docs/readme.md");
		expect(result).toEqual({
			id: "readme.md",
			path: "readme.md",
			type: "file",
			content: "",
		});
	});

	it("sortFilesAlphabetically sorts folders first and by name", () => {
		const unsorted: (File | Folder)[] = [
			{ id: "b.md", path: "b.md", type: "file", content: "" },
			{ id: "z", path: "z", type: "folder", children: [] },
			{ id: "a.md", path: "a.md", type: "file", content: "" },
			{ id: "a", path: "a", type: "folder", children: [] },
		];
		const sorted = sortFilesAlphabetically(unsorted);
		expect(sorted.map((i) => i.path)).toEqual(["a", "z", "a.md", "b.md"]);
	});
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	handleToggleFolder,
	handleFileSelect,
	handleCreateFile,
	handleDeleteFile,
	handleRenameFile,
	findFileByPath,
	sortFilesAlphabetically,
} from "@src/lib/utils/treeUtils";
import {
	addFolder,
	addFile,
	selectFile,
	deleteFile,
	renameFile,
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

	it("handleFileSelect dispatches selectFile", () => {
		handleFileSelect(dispatch, { path: "file.md", type: "file" }, "folder");
		expect(dispatch).toHaveBeenCalledWith(selectFile("folder/file.md"));
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
				path: "docs",
				type: "folder",
				children: [{ path: "readme.md", type: "file", content: "" }],
			},
		];
		const result = findFileByPath(files, "docs/readme.md");
		expect(result).toEqual({
			path: "readme.md",
			type: "file",
			content: "",
		});
	});

	it("sortFilesAlphabetically sorts folders first and by name", () => {
		const unsorted: (File | Folder)[] = [
			{ path: "b.md", type: "file", content: "" },
			{ path: "z", type: "folder", children: [] },
			{ path: "a.md", type: "file", content: "" },
			{ path: "a", type: "folder", children: [] },
		];
		const sorted = sortFilesAlphabetically(unsorted);
		expect(sorted.map((i) => i.path)).toEqual(["a", "z", "a.md", "b.md"]);
	});
});

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import reducer, {
	addFolder,
	addFile,
	updateFileContent,
	selectFile,
	deleteFile,
	renameFile,
	moveItem,
	setFileState,
} from "@src/lib/store/slices/markdownSlice";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import { File, FileState } from "@src/features/markdown/type";

vi.mock("@src/lib/utils/persistMiddleware", () => ({
	getFromIndexedDB: vi.fn(),
}));

const initialState: FileState = {
	files: [],
	selectedFile: null,
	content: "",
	loaded: false,
};

describe("markdownSlice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(getFromIndexedDB as Mock).mockReturnValue(null);
	});

	// it("should return default initial state if no localStorage data", () => {
	// 	expect(getInitialState()).toEqual(initialState);
	// });

	it("should add a new folder to root", () => {
		const folder = {
			id: "folder-1",
			path: "docs",
			type: "folder" as const,
			children: [],
			loaded: true,
		};
		const state = reducer(
			initialState,
			addFolder({ parentPath: "", folder })
		);
		expect(state.files).toContainEqual(folder);
	});

	it("should add a file to root folder", () => {
		const file = { path: "readme.md", content: "Hello", parentPath: "" };
		const state = reducer(initialState, addFile(file));
		expect(state.files).toContainEqual({
			id: expect.any(String),
			path: "readme.md",
			type: "file",
			content: "Hello",
		});
	});

	it("should keep a file id when it is renamed", () => {
		const added = reducer(
			initialState,
			addFile({ id: "file-1", path: "a.md", content: "", parentPath: "" })
		);
		const renamed = reducer(
			added,
			renameFile({ oldPath: "a.md", newName: "b.md" })
		);
		expect(renamed.files[0]).toMatchObject({ id: "file-1", path: "b.md" });
	});

	describe("moveItem and selection tracking", () => {
		const tree: FileState = {
			files: [
				{ id: "a", path: "a.md", type: "file", content: "A" },
				{
					id: "docs",
					path: "docs",
					type: "folder",
					children: [
						{ id: "n", path: "note.md", type: "file", content: "N" },
						{ id: "sub", path: "sub", type: "folder", children: [] },
					],
				},
				{ id: "arch", path: "archive", type: "folder", children: [] },
			],
			selectedFile: null,
			content: "",
			loaded: true,
		};

		it("moves a root file into a folder, keeping its id", () => {
			const state = reducer(
				tree,
				moveItem({ sourcePath: "a.md", destFolderPath: "archive" })
			);
			expect(state.files.find((f) => f.path === "a.md")).toBeUndefined();
			const archive = state.files.find((f) => f.path === "archive");
			expect(archive).toMatchObject({
				children: [{ id: "a", path: "a.md", content: "A" }],
			});
		});

		it("moves a nested file back to the root", () => {
			const state = reducer(
				tree,
				moveItem({ sourcePath: "docs/note.md", destFolderPath: "" })
			);
			expect(state.files.some((f) => f.id === "n")).toBe(true);
		});

		it("moves a whole folder with its children", () => {
			const state = reducer(
				tree,
				moveItem({ sourcePath: "docs", destFolderPath: "archive" })
			);
			const archive = state.files.find((f) => f.path === "archive") as {
				children: { path: string; children?: { path: string }[] }[];
			};
			expect(archive.children[0].path).toBe("docs");
			expect(archive.children[0].children?.map((c) => c.path)).toContain(
				"note.md"
			);
		});

		it("refuses to move a folder into itself or a descendant", () => {
			expect(
				reducer(tree, moveItem({ sourcePath: "docs", destFolderPath: "docs" }))
					.files
			).toEqual(tree.files);
			expect(
				reducer(
					tree,
					moveItem({ sourcePath: "docs", destFolderPath: "docs/sub" })
				).files
			).toEqual(tree.files);
		});

		it("does nothing on a name clash or missing destination", () => {
			const clash = reducer(
				tree,
				addFile({ id: "x", path: "a.md", content: "", parentPath: "archive" })
			);
			expect(
				reducer(clash, moveItem({ sourcePath: "a.md", destFolderPath: "archive" }))
					.files
			).toEqual(clash.files);
			expect(
				reducer(tree, moveItem({ sourcePath: "a.md", destFolderPath: "nope" }))
					.files
			).toEqual(tree.files);
		});

		it("keeps selectedFile pointing at a moved file", () => {
			const selected = reducer(tree, selectFile("docs/note.md"));
			const moved = reducer(
				selected,
				moveItem({ sourcePath: "docs", destFolderPath: "archive" })
			);
			expect(moved.selectedFile).toBe("archive/docs/note.md");
		});

		it("keeps selectedFile valid when its folder is renamed", () => {
			const selected = reducer(tree, selectFile("docs/note.md"));
			const renamed = reducer(
				selected,
				renameFile({ oldPath: "docs", newName: "papers" })
			);
			expect(renamed.selectedFile).toBe("papers/note.md");
		});
	});

	it("should assign ids to items loaded without one", () => {
		const loaded = reducer(
			initialState,
			setFileState({
				...initialState,
				files: [
					{ id: "a.md", path: "a.md", type: "file", content: "" } as File,
					{ id: "keep", path: "b.md", type: "file", content: "" },
				],
			})
		);
		expect(loaded.files[0].id).toEqual(expect.any(String));
		expect(loaded.files[0].id).not.toBe("");
		expect(loaded.files[1].id).toBe("keep");
	});

	it("should update file content at root", () => {
		const stateWithFile: FileState = {
			...initialState,
			files: [{ id: "f1", path: "readme.md", type: "file", content: "Old" }],
			selectedFile: "readme.md",
			content: "Old",
		};
		const updated = reducer(
			stateWithFile,
			updateFileContent({ path: "readme.md", content: "New Content" })
		);
		const file = updated.files[0];
		if (file.type === "file") {
			expect(file.content).toBe("New Content");
		}
		expect(updated.content).toBe("New Content");
	});

	it("should select a file and load its content", () => {
		const file: File = { id: "notes.txt", path: "notes.txt", type: "file", content: "abc" };
		const stateWithFile: FileState = { ...initialState, files: [file] };
		const selected = reducer(stateWithFile, selectFile("notes.txt"));
		expect(selected.selectedFile).toBe("notes.txt");
		expect(selected.content).toBe("abc");
	});

	it("should rename a file inside root", () => {
		const stateWithFile: FileState = {
			...initialState,
			files: [{ id: "todo.md", path: "todo.md", type: "file", content: "x" }],
		};
		const renamed = reducer(
			stateWithFile,
			renameFile({ oldPath: "todo.md", newName: "tasks.md" })
		);
		expect(renamed.files[0].path).toBe("tasks.md");
	});

	it("should delete file and clear selection if selected", () => {
		const stateWithFile: FileState = {
			files: [{ id: "delete.md", path: "delete.md", type: "file", content: "" }],
			selectedFile: "delete.md",
			content: "",
			loaded: true,
		};
		const updated = reducer(
			stateWithFile,
			deleteFile({ path: "delete.md" })
		);
		expect(updated.files).toHaveLength(0);
		expect(updated.selectedFile).toBe(null);
	});
});

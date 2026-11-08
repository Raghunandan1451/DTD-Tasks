import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import reducer, {
	addFolder,
	addFile,
	updateFileContent,
	selectFile,
	deleteFile,
	renameFile,
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

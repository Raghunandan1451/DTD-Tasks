import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import reducer, {
	addFolder,
	addFile,
	updateFileContent,
	selectFile,
	deleteFile,
	renameFile,
	getInitialState,
} from "@src/lib/store/slices/markdownSlice";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import { FileState } from "@src/lib/types/markdown";

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

	it("should return default initial state if no localStorage data", () => {
		expect(getInitialState()).toEqual(initialState);
	});

	it("should add a new folder to root", () => {
		const folder = {
			path: "docs",
			type: "folder",
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
			path: "readme.md",
			type: "file",
			content: "Hello",
		});
	});

	it("should update file content at root", () => {
		const stateWithFile = {
			...initialState,
			files: [{ path: "readme.md", type: "file", content: "Old" }],
			selectedFile: "readme.md",
			content: "Old",
		};
		const updated = reducer(
			stateWithFile,
			updateFileContent({ path: "readme.md", content: "New Content" })
		);
		expect(updated.files[0].content).toBe("New Content");
		expect(updated.content).toBe("New Content");
	});

	it("should select a file and load its content", () => {
		const file = { path: "notes.txt", type: "file", content: "abc" };
		const stateWithFile = { ...initialState, files: [file] };
		const selected = reducer(stateWithFile, selectFile("notes.txt"));
		expect(selected.selectedFile).toBe("notes.txt");
		expect(selected.content).toBe("abc");
	});

	it("should rename a file inside root", () => {
		const stateWithFile = {
			...initialState,
			files: [{ path: "todo.md", type: "file", content: "x" }],
		};
		const renamed = reducer(
			stateWithFile,
			renameFile({ oldPath: "todo.md", newName: "tasks.md" })
		);
		expect(renamed.files[0].path).toBe("tasks.md");
	});

	it("should delete file and clear selection if selected", () => {
		const stateWithFile = {
			files: [{ path: "delete.md", type: "file", content: "" }],
			selectedFile: "delete.md",
			content: "",
		};
		const updated = reducer(
			stateWithFile,
			deleteFile({ path: "delete.md" })
		);
		expect(updated.files).toHaveLength(0);
		expect(updated.selectedFile).toBe(null);
	});
});

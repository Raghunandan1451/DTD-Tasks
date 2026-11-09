import { render, screen, fireEvent } from "@testing-library/react";
import { handleCreateFile } from "@src/lib/utils/treeUtils";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import TreeView from "@src/features/markdown/TreeView";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { File } from "@src/features/markdown/type";

// Mock notifications hook
vi.mock("@src/lib/hooks/useNotifications", () => ({
	default: () => ({
		notifications: [],
		showNotification: vi.fn(),
	}),
}));

// Mock tree utils
vi.mock("@src/lib/utils/treeUtils", async () => {
	const actual = await vi.importActual("@src/lib/utils/treeUtils");
	return {
		...actual,
		handleCreateFile: vi.fn(),
		handleDeleteFile: vi.fn(),
		handleFileSelect: vi.fn(),
		handleToggleFolder: vi.fn(),
		handleRenameFile: vi.fn(),
		sortFilesAlphabetically: (files: File[]) => files,
	};
});

// Sample state for fileManager slice
const filesMock = [
	{
		type: "folder",
		path: "Folder1",
		children: [
			{
				type: "file",
				path: "File1.md",
			},
		],
	},
	{
		type: "file",
		path: "File2.md",
	},
];

// Create a dummy reducer for fileManager that always returns our state.
const fileManagerReducer = (state = { files: filesMock, selectedFile: "" }) =>
	state;

// Create a store using Redux Toolkit's configureStore.
const store = configureStore({
	reducer: {
		fileManager: fileManagerReducer,
	},
});

describe("TreeView Component", () => {
	it("renders TreeView with files and folders", () => {
		render(
			<Provider store={store}>
				<TreeView showInput={false} setShowInput={() => {}} selectedItem={null} setSelectedItem={() => {}} />
			</Provider>
		);

		expect(screen.getByText("Folder1")).toBeInTheDocument();
		expect(screen.getByText("File2.md")).toBeInTheDocument();
	});

	it("shows input when showInput is true", () => {
		render(
			<Provider store={store}>
				<TreeView showInput={true} setShowInput={() => {}} selectedItem={null} setSelectedItem={() => {}} />
			</Provider>
		);

		expect(
			screen.getByPlaceholderText("folder/file.md")
		).toBeInTheDocument();
	});

	const createWith = (
		selectedItem: { fullPath: string; name: string; type: "file" | "folder" } | null
	) => {
		vi.mocked(handleCreateFile).mockClear();
		render(
			<Provider store={store}>
				<TreeView
					showInput={true}
					setShowInput={() => {}}
					selectedItem={selectedItem}
					setSelectedItem={() => {}}
				/>
			</Provider>
		);
		const input = screen.getByPlaceholderText("folder/file.md");
		fireEvent.change(input, { target: { value: "idea" } });
		fireEvent.keyDown(input, { key: "Enter" });
	};

	it("creates the new file inside the selected folder", () => {
		createWith({ fullPath: "Folder1", name: "Folder1", type: "folder" });
		expect(handleCreateFile).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			"Folder1/idea"
		);
	});

	it("creates at the root when nothing or a file is selected", () => {
		createWith({ fullPath: "File2.md", name: "File2.md", type: "file" });
		expect(handleCreateFile).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			"idea"
		);
	});
});

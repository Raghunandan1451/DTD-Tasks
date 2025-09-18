import { render, screen } from "@testing-library/react";
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
				<TreeView showInput={false} setShowInput={() => {}} />
			</Provider>
		);

		expect(screen.getByText("Folder1")).toBeInTheDocument();
		expect(screen.getByText("File2.md")).toBeInTheDocument();
	});

	it("shows input when showInput is true", () => {
		render(
			<Provider store={store}>
				<TreeView showInput={true} setShowInput={() => {}} />
			</Provider>
		);

		// Assuming CreateFileFolder renders an input with a placeholder like "filename"
		expect(
			screen.getByPlaceholderText("Enter folder/file name")
		).toBeInTheDocument();
	});
});

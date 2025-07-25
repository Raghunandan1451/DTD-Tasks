import { render, screen, fireEvent } from "@testing-library/react";
import FileTree from "@src/features/markdown/FileTree";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import markdownReducer from "@src/lib/store/slices/markdownSlice";

// Mock TreeView to test showInput behavior
vi.mock("@src/features/markdown/TreeView", () => ({
	__esModule: true,
	default: ({ showInput }: { showInput: boolean }) => (
		<div data-testid="treeview">
			{showInput ? "Input Visible" : "Tree View"}
		</div>
	),
}));

describe("FileTree component", () => {
	let store;

	beforeEach(() => {
		store = configureStore({
			reducer: { fileManager: markdownReducer },
		});
	});

	const renderWithStore = () =>
		render(
			<Provider store={store}>
				<FileTree />
			</Provider>
		);

	it("renders the Add File button", () => {
		renderWithStore();

		const addButton = screen.getByRole("button", { name: /add file/i });
		expect(addButton).toBeInTheDocument();
	});

	it("displays input when Add File button is clicked", async () => {
		renderWithStore();

		const addButton = screen.getByRole("button", { name: /add file/i });
		fireEvent.click(addButton);

		const treeView = screen.getByTestId("treeview");
		expect(treeView).toHaveTextContent("Input Visible");
	});

	it("renders TreeView with initial state before interaction", () => {
		renderWithStore();

		const treeView = screen.getByTestId("treeview");
		expect(treeView).toHaveTextContent("Tree View");
	});
});

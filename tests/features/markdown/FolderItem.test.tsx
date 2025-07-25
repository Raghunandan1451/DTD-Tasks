import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, beforeEach, it, expect, vi } from "vitest";
import FolderItem from "@src/features/markdown/FolderItem";

describe("FolderItem", () => {
	let mockOnToggle: ReturnType<typeof vi.fn>;
	let mockOnDelete: ReturnType<typeof vi.fn>;
	let mockOnRename: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnToggle = vi.fn();
		mockOnDelete = vi.fn();
		mockOnRename = vi.fn();

		render(
			<FolderItem
				path="MyFolder"
				isExpanded={false}
				onToggle={mockOnToggle}
				onDelete={mockOnDelete}
				onRename={mockOnRename}
			/>
		);
	});

	it("renders the folder name correctly", () => {
		expect(screen.getByText("MyFolder")).toBeInTheDocument();
	});

	it("calls onToggle when clicked", () => {
		fireEvent.click(screen.getByText("MyFolder"));
		expect(mockOnToggle).toHaveBeenCalled();
	});

	it("calls onDelete when delete button is clicked", () => {
		const deleteButton = screen.getByTestId("trash");
		fireEvent.click(deleteButton);
		expect(mockOnDelete).toHaveBeenCalled();
	});

	it("calls onRename when edit button is clicked", () => {
		const editButton = screen.getByTestId("edit");
		fireEvent.click(editButton);
		expect(mockOnRename).toHaveBeenCalled();
	});

	it("shows ChevronDown when expanded", () => {
		render(
			<FolderItem
				path="MyFolder"
				isExpanded={true}
				onToggle={mockOnToggle}
				onDelete={mockOnDelete}
				onRename={mockOnRename}
			/>
		);

		expect(screen.getByTestId("chevron-down")).toBeInTheDocument();
	});

	it("shows ChevronRight when collapsed", () => {
		expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
	});
});

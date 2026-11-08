import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, beforeEach, it, expect, vi } from "vitest";
import FolderItem from "@src/features/markdown/FolderItem";

describe("FolderItem", () => {
	let mockOnToggle: ReturnType<typeof vi.fn>;
	let mockOnSelect: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnToggle = vi.fn();
		mockOnSelect = vi.fn();

		render(
			<FolderItem
				path="MyFolder"
				isExpanded={false}
				isSelected={false}
				onToggleExpand={mockOnToggle}
				onSelect={mockOnSelect}
			/>
		);
	});

	it("renders the folder name correctly", () => {
		expect(screen.getByText("MyFolder")).toBeInTheDocument();
	});

	it("selects the folder when its name is clicked, without toggling", () => {
		fireEvent.click(screen.getByText("MyFolder"));
		expect(mockOnSelect).toHaveBeenCalledTimes(1);
		expect(mockOnToggle).not.toHaveBeenCalled();
	});

	it("toggles expansion from the chevron, without selecting", () => {
		fireEvent.click(screen.getByTestId("chevron-right"));
		expect(mockOnToggle).toHaveBeenCalledTimes(1);
		expect(mockOnSelect).not.toHaveBeenCalled();
	});

	it("shows ChevronDown when expanded", () => {
		render(
			<FolderItem
				path="MyFolder"
				isExpanded={true}
				isSelected={false}
				onToggleExpand={mockOnToggle}
				onSelect={mockOnSelect}
			/>
		);

		expect(screen.getByTestId("chevron-down")).toBeInTheDocument();
	});

	it("shows ChevronRight when collapsed", () => {
		expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
	});
});

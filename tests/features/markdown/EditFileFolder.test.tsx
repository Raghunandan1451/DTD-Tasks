import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import EditFileFolder from "@src/features/markdown/EditFileFolder";
import { describe, expect, it, vi } from "vitest";

describe("EditFileFolder", () => {
	it("renders correctly with initial props", () => {
		const mockSetShowRenameInput = vi.fn();
		const mockSetRenameValue = vi.fn();
		const mockOnEdit = vi.fn();

		render(
			<EditFileFolder
				renameValue="oldName"
				setShowRenameInput={mockSetShowRenameInput}
				setRenameValue={mockSetRenameValue}
				onEdit={mockOnEdit}
			/>
		);

		expect(
			screen.getByPlaceholderText("Enter new name")
		).toBeInTheDocument();
		expect(screen.getByText("Rename")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("calls onEdit when Rename button is clicked", () => {
		const mockSetShowRenameInput = vi.fn();
		const mockSetRenameValue = vi.fn();
		const mockOnEdit = vi.fn();

		render(
			<EditFileFolder
				renameValue="oldName"
				setShowRenameInput={mockSetShowRenameInput}
				setRenameValue={mockSetRenameValue}
				onEdit={mockOnEdit}
			/>
		);

		fireEvent.click(screen.getByText("Rename"));
		expect(mockOnEdit).toHaveBeenCalled();
	});

	it("calls setShowRenameInput and setRenameValue when Cancel button is clicked", () => {
		const mockSetShowRenameInput = vi.fn();
		const mockSetRenameValue = vi.fn();
		const mockOnEdit = vi.fn();

		render(
			<EditFileFolder
				renameValue="oldName"
				setShowRenameInput={mockSetShowRenameInput}
				setRenameValue={mockSetRenameValue}
				onEdit={mockOnEdit}
			/>
		);

		fireEvent.click(screen.getByText("Cancel"));
		expect(mockSetShowRenameInput).toHaveBeenCalledWith(false);
		expect(mockSetRenameValue).toHaveBeenCalledWith("");
	});

	it("updates input value when changed", () => {
		const mockSetShowRenameInput = vi.fn();
		const mockSetRenameValue = vi.fn();
		const mockOnEdit = vi.fn();

		render(
			<EditFileFolder
				renameValue="oldName"
				setShowRenameInput={mockSetShowRenameInput}
				setRenameValue={mockSetRenameValue}
				onEdit={mockOnEdit}
			/>
		);

		const input = screen.getByPlaceholderText("Enter new name");
		fireEvent.change(input, { target: { value: "newName" } });

		expect(mockSetRenameValue).toHaveBeenCalledWith("newName");
	});
});

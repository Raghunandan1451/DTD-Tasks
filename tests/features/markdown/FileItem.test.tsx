import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FileItem from "@src/features/markdown/FileItem";

describe("FileItem", () => {
	let mockOnSelect: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnSelect = vi.fn();

		render(
			<FileItem
				path="example.md"
				isSelected={false}
				onSelect={mockOnSelect}
			/>
		);
	});

	it("renders the file name correctly", () => {
		expect(screen.getByText("example.md")).toBeInTheDocument();
	});

	it("calls onSelect when clicked", () => {
		fireEvent.click(screen.getByText("example.md"));
		expect(mockOnSelect).toHaveBeenCalled();
	});

	it("is not highlighted when not selected", () => {
		expect(screen.getByText("example.md").closest("div")).not.toHaveClass(
			"bg-blue-500/20"
		);
	});

	it("applies selected class when isSelected is true", () => {
		render(
			<FileItem
				path="example1.md"
				isSelected={true}
				onSelect={mockOnSelect}
			/>
		);

		const fileItem = screen.getByText("example1.md").closest("div");
		expect(fileItem).toHaveClass("bg-blue-500/20");
	});
});

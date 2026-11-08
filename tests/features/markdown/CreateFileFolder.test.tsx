import "@testing-library/jest-dom";

import { render, screen, fireEvent } from "@testing-library/react";
import CreateFileFolder from "@src/features/markdown/CreateFileFolder";
import { describe, it, expect, vi } from "vitest";

describe("CreateFileFolder Component", () => {
	it("renders the input field with the correct placeholder", () => {
		render(
			<CreateFileFolder
				setShowInput={() => {}}
				newFilePath=""
				setNewFilePath={() => {}}
				onCreate={() => {}}
			/>
		);
		const input = screen.getByPlaceholderText("folder/file.md");
		expect(input).toBeInTheDocument();
	});

	it("updates input value when typed", () => {
		const setNewFilePathMock = vi.fn();
		render(
			<CreateFileFolder
				setShowInput={() => {}}
				newFilePath=""
				setNewFilePath={setNewFilePathMock}
				onCreate={() => {}}
			/>
		);
		const input = screen.getByPlaceholderText("folder/file.md");
		fireEvent.change(input, { target: { value: "NewFile.md" } });

		expect(setNewFilePathMock).toHaveBeenCalledWith("NewFile.md");
	});

	it("calls onCreate when Enter is pressed in the input field", () => {
		const onCreateMock = vi.fn();
		render(
			<CreateFileFolder
				setShowInput={() => {}}
				newFilePath="Test.md"
				setNewFilePath={() => {}}
				onCreate={onCreateMock}
			/>
		);
		const input = screen.getByPlaceholderText("folder/file.md");
		fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

		expect(onCreateMock).toHaveBeenCalledTimes(1);
	});

	it("closes and clears on Escape", () => {
		const setShowInputMock = vi.fn();
		const setNewFilePathMock = vi.fn();
		render(
			<CreateFileFolder
				setShowInput={setShowInputMock}
				newFilePath="draft"
				setNewFilePath={setNewFilePathMock}
				onCreate={() => {}}
			/>
		);
		fireEvent.keyDown(screen.getByPlaceholderText("folder/file.md"), {
			key: "Escape",
		});

		expect(setShowInputMock).toHaveBeenCalledWith(false);
		expect(setNewFilePathMock).toHaveBeenCalledWith("");
	});

	it("closes on blur only when nothing was typed", () => {
		const setShowInputMock = vi.fn();
		const { rerender } = render(
			<CreateFileFolder
				setShowInput={setShowInputMock}
				newFilePath="draft"
				setNewFilePath={() => {}}
				onCreate={() => {}}
			/>
		);
		fireEvent.blur(screen.getByPlaceholderText("folder/file.md"));
		expect(setShowInputMock).not.toHaveBeenCalled();

		rerender(
			<CreateFileFolder
				setShowInput={setShowInputMock}
				newFilePath=""
				setNewFilePath={() => {}}
				onCreate={() => {}}
			/>
		);
		fireEvent.blur(screen.getByPlaceholderText("folder/file.md"));
		expect(setShowInputMock).toHaveBeenCalledWith(false);
	});
});

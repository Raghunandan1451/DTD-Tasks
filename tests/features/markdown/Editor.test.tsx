import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Editor from "@src/features/markdown/Editor"; // path: organisms/Editor
import { vi, describe, it, beforeEach, expect, Mock } from "vitest";
import { useSelector, useDispatch } from "react-redux";
import { updateFileContent } from "@src/lib/store/slices/markdownSlice";
import "@testing-library/jest-dom";

vi.mock("react-redux");
const useSelectorMock = vi.mocked(useSelector);
const useDispatchMock = vi.mocked(useDispatch);
vi.mock("@src/features/markdown/MarkdownPreview", () => ({
	__esModule: true,
	default: () => <div data-testid="markdown-preview" />,
}));
vi.mock("@src/components/ui/textBox/Textarea", () => ({
	__esModule: true,
	default: ({
		value,
		onChange,
	}: {
		value: string;
		onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	}) => <textarea data-testid="textarea" value={value} onChange={onChange} />,
}));

describe("Editor", () => {
	const mockDispatch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(useDispatchMock as Mock).mockReturnValue(mockDispatch);
	});

	it("shows placeholder message when no file is selected", () => {
		(useSelectorMock as Mock).mockImplementation((selectorFn) =>
			selectorFn({
				fileManager: { selectedFile: null, content: "" },
			})
		);

		render(<Editor />);
		expect(
			screen.getByText("Select a file to start editing")
		).toBeInTheDocument();
	});

	it("renders editor UI when file is selected", () => {
		(useSelectorMock as Mock).mockImplementation((selectorFn) =>
			selectorFn({
				fileManager: {
					selectedFile: "notes.md",
					content: "Hello Markdown",
				},
			})
		);

		render(<Editor />);

		expect(screen.getByText("notes.md")).toBeInTheDocument();
		expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
		expect(screen.getByTestId("textarea")).toBeInTheDocument();
		expect(screen.getByTestId("textarea")).toHaveValue("Hello Markdown");
	});

	it("dispatches updateFileContent on textarea change", () => {
		(useSelectorMock as Mock).mockImplementation((selectorFn) =>
			selectorFn({
				fileManager: { selectedFile: "test.md", content: "Initial" },
			})
		);

		render(<Editor />);

		const textarea = screen.getByTestId("textarea");
		fireEvent.change(textarea, { target: { value: "Updated Content" } });

		expect(mockDispatch).toHaveBeenCalledWith(
			updateFileContent({ path: "test.md", content: "Updated Content" })
		);
	});
});

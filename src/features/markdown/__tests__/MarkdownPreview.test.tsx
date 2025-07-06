import React from "react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownPreview from "../../molecules/Markdown/MarkdownPreview";
import { parseMarkdown } from "../../../utils/parseMarkdown";
import { useSelector } from "react-redux";
import "@testing-library/jest-dom";

// Create a mock for RootState since we can't import it directly in test
interface MockRootState {
	fileManager: {
		content: string;
	};
}

// Mock dependencies
vi.mock("react-redux", () => ({
	useSelector: vi.fn(),
}));

vi.mock("../../../../utils/parseMarkdown", () => ({
	parseMarkdown: vi.fn(),
}));

describe("MarkdownPreview", () => {
	const mockContent = "# Test Markdown";
	const mockParsedContent = [<h1 key="1">Test Markdown</h1>];

	beforeEach(() => {
		vi.clearAllMocks();

		// Properly type the mocks
		const mockedUseSelector = useSelector as unknown as Mock;
		mockedUseSelector.mockImplementation(
			(selector: (state: MockRootState) => unknown) => {
				const mockState: MockRootState = {
					fileManager: {
						content: mockContent,
					},
				};

				return selector(mockState);
			}
		);

		const mockedParseMarkdown = parseMarkdown as unknown as Mock;
		mockedParseMarkdown.mockReturnValue(mockParsedContent);

		// Mock the scrollIntoView functionality
		Element.prototype.scrollTo = vi.fn();
		Object.defineProperties(HTMLElement.prototype, {
			scrollHeight: {
				configurable: true,
				value: 100,
			},
			clientHeight: {
				configurable: true,
				value: 50,
			},
			scrollTop: {
				configurable: true,
				value: 0,
				writable: true,
			},
		});
	});

	it("renders the parsed markdown content", () => {
		render(<MarkdownPreview />);

		// Check if parseMarkdown was called with the correct content
		expect(parseMarkdown).toHaveBeenCalledWith(mockContent);

		// Check if the parsed content is rendered
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Test Markdown"
		);
	});

	it("applies auto-scrolling to the bottom when content changes", () => {
		// Create a ref spy
		const scrollTopSpy = vi.spyOn(
			HTMLElement.prototype,
			"scrollTop",
			"set"
		);

		render(<MarkdownPreview />);

		// Verify auto-scrolling was applied
		expect(scrollTopSpy).toHaveBeenCalledWith(50); // scrollHeight (100) - clientHeight (50) = 50
	});

	it("renders with the correct CSS classes", () => {
		render(<MarkdownPreview />);

		const container = screen.getByTestId("markdown-preview");
		expect(container).toHaveClass("flex-1");
		expect(container).toHaveClass("overflow-y-auto");
		expect(container).toHaveClass("p-2");
		expect(container).toHaveClass("bg-gray-700");
		expect(container).toHaveClass("rounded-sm");
		expect(container).toHaveClass("mb-4");
	});
});

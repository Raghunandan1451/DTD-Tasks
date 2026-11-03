import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownPreview from "@src/components/shared/preview_editor/MarkdownPreview";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";
import "@testing-library/jest-dom";

vi.mock("@src/lib/utils/parseMarkdown", () => ({
	parseMarkdown: vi.fn(),
}));

describe("MarkdownPreview", () => {
	const content = "# Test Markdown";

	beforeEach(() => {
		vi.clearAllMocks();
		(parseMarkdown as unknown as Mock).mockReturnValue([
			<h1 key="1">Test Markdown</h1>,
		]);

		// Fake layout: 100px of content in a 50px box.
		Object.defineProperties(HTMLElement.prototype, {
			scrollHeight: { configurable: true, value: 100 },
			clientHeight: { configurable: true, value: 50 },
			scrollTop: { configurable: true, value: 0, writable: true },
		});
	});

	it("renders the parsed markdown content", () => {
		render(<MarkdownPreview content={content} />);

		expect(parseMarkdown).toHaveBeenCalledWith(content);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Test Markdown"
		);
	});

	it("scrolls to the bottom when auto-scroll is on", () => {
		render(<MarkdownPreview content={content} enableAutoScroll />);

		// scrollHeight (100) - clientHeight (50)
		expect(screen.getByTestId("markdown-preview").scrollTop).toBe(50);
	});

	it("stays at the top when auto-scroll is off", () => {
		render(<MarkdownPreview content={content} />);

		expect(screen.getByTestId("markdown-preview").scrollTop).toBe(0);
	});

	it("renders with the correct CSS classes", () => {
		render(<MarkdownPreview content={content} />);

		const container = screen.getByTestId("markdown-preview");
		expect(container).toHaveClass("h-full");
		expect(container).toHaveClass("overflow-y-auto");
		expect(container).toHaveClass("p-2");
		expect(container).toHaveClass("rounded-sm");
	});
});

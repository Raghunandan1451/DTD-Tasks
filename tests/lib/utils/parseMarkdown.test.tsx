import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";

describe("parseMarkdown", () => {
	it("renders a paragraph", () => {
		const { container } = render(
			<>{parseMarkdown("This is a paragraph")}</>
		);
		expect(container.querySelector("p")).toBeTruthy();
		expect(container.textContent).toBe("This is a paragraph");
	});

	it("renders headers correctly", () => {
		const { container } = render(
			<>{parseMarkdown(`# Title\n## Subtitle\n### Smaller Title`)}</>
		);
		expect(container.querySelector("h1")?.textContent).toBe("Title");
		expect(container.querySelector("h2")?.textContent).toBe("Subtitle");
		expect(container.querySelector("h3")?.textContent).toBe(
			"Smaller Title"
		);
	});

	it("renders list items", () => {
		const { container } = render(
			<>{parseMarkdown(`- Item 1\n- Item 2`)}</>
		);
		const items = container.querySelectorAll("li");
		expect(items.length).toBe(2);
		expect(items[0].textContent).toBe("Item 1");
		expect(items[1].textContent).toBe("Item 2");
	});

	it("renders blockquote", () => {
		const { container } = render(<>{parseMarkdown(`> Quoted text`)}</>);
		const blockquote = container.querySelector("blockquote");
		expect(blockquote).toBeTruthy();
		expect(blockquote?.textContent).toBe("Quoted text");
	});

	it("renders line breaks", () => {
		const { container } = render(<>{parseMarkdown(`Line 1\n\nLine 2`)}</>);
		const br = container.querySelector("br");
		expect(br).toBeTruthy();
	});

	it("renders bold + italic (***)", () => {
		const { container } = render(<>{parseMarkdown(`***bold italic***`)}</>);
		const strong = container.querySelector("strong");
		const em = strong?.querySelector("em");
		expect(strong).toBeTruthy();
		expect(em).toBeTruthy();
		expect(em?.textContent).toBe("bold italic");
	});

	it("renders underline + italic (*__...__*)", () => {
		const { container } = render(
			<>{parseMarkdown(`*__underline italic__*`)}</>
		);
		const em = container.querySelector("em");
		const underline = em?.querySelector("u");
		expect(em).toBeTruthy();
		expect(underline).toBeTruthy();
		expect(underline?.textContent).toBe("underline italic");
	});

	it("renders code", () => {
		const { container } = render(
			<>{parseMarkdown("Here is `code` inline")}</>
		);
		const code = container.querySelector("code");
		expect(code).toBeTruthy();
		expect(code?.textContent).toBe("code");
		expect(code?.className).toContain("bg-gray-700");
	});

	it("handles mixed inline styles", () => {
		const { container } = render(
			<>
				{parseMarkdown(
					"Text with **bold**, *italic*, __underline__, and ~strikethrough~"
				)}
			</>
		);
		expect(container.querySelector("strong")?.textContent).toBe("bold");
		expect(container.querySelector("em")?.textContent).toBe("italic");
		expect(container.querySelector("u")?.textContent).toBe("underline");
		expect(container.querySelector("s")?.textContent).toBe("strikethrough");
	});
});

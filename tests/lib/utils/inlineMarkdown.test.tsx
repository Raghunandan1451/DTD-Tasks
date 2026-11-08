import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { parseInlineTree, inlineToPlainText } from "@src/lib/utils/inlineMarkdown";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";

const html = (text: string) => {
	const { container } = render(<div>{parseMarkdown(text)}</div>);
	return container.innerHTML;
};

describe("parseInlineTree", () => {
	it("nests marks in any order", () => {
		const [node] = parseInlineTree("~~__this__~~");
		expect(node).toMatchObject({ type: "format", kind: "strike" });
		const inner = (node as { children: unknown[] }).children[0];
		expect(inner).toMatchObject({ type: "format", kind: "underline" });
	});

	it("keeps code literal", () => {
		expect(parseInlineTree("`**raw**`")).toEqual([{ type: "code", text: "**raw**" }]);
	});

	it("leaves lookalikes as plain text", () => {
		const text = "2 * 3 * 4 and snake_case_name and **unclosed";
		expect(inlineToPlainText(parseInlineTree(text))).toBe(text);
		expect(parseInlineTree(text).every((n) => n.type === "text")).toBe(true);
	});

	it("flattens links to label (address)", () => {
		expect(inlineToPlainText(parseInlineTree("[**hi** there](http://x.y)"))).toBe(
			"hi there (http://x.y)",
		);
	});
});

describe("preview rendering of nested marks", () => {
	it("renders ~~__this__~~ without leaking placeholders", () => {
		const out = html("Checking ~~__this__~~ and the length");
		expect(out).not.toContain("PLACEHOLDER");
		expect(out).toContain("<s><u>this</u></s>");
	});

	it("renders italic inside bold", () => {
		expect(html("**a *b* c**")).toContain("<strong>a <em>b</em> c</strong>");
	});

	it("renders formatting inside a link label", () => {
		const out = html("[**bold** link](http://x.y)");
		expect(out).toContain("<strong>bold</strong>");
		expect(out).toContain('href="http://x.y"');
		expect(out).not.toContain("PLACEHOLDER");
	});

	it("does not format inside code", () => {
		const out = html("`~~__x__~~`");
		expect(out).toContain("~~__x__~~");
		expect(out).not.toContain("<s>");
	});
});

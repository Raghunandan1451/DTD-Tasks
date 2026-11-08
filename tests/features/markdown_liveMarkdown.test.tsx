import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { highlightMarkdown } from "@src/features/markdown/lib/liveMarkdown";
import {
	parsePages,
	paginateText,
	serializePages,
	formatPageDate,
} from "@src/features/markdown/lib/pages";

const text = (src: string) => {
	const { container } = render(<div>{highlightMarkdown(src)}</div>);
	return container;
};

describe("highlightMarkdown", () => {
	it("never changes the characters (keeps textarea alignment)", () => {
		const src = "# Title\n**bold** and *it* ~~x~~ `c`\n- item\n> q\n```\ncode\n```";
		expect(text(src).textContent).toBe(src);
	});
	it("styles bold in place", () => {
		expect(text("a **b** c").querySelector(".font-bold")?.textContent).toBe("b");
	});
	it("styles ***bold italic*** as one span, with all three asterisks as marks", () => {
		const view = text("see ***live*** now");
		const styled = view.querySelector(".font-bold.italic");
		expect(styled?.textContent).toBe("live");
		// No stray asterisks are left outside the marks.
		const marks = [...view.querySelectorAll(".text-gray-500")].map((m) => m.textContent);
		expect(marks).toEqual(["***", "***"]);
		expect(view.textContent).toBe("see ***live*** now");
	});
	it("handles italic inside bold and the other nesting orders", () => {
		const view = text("**a *b* c**");
		expect(view.querySelector(".font-bold")?.textContent).toBe("a *b* c");
		expect(view.querySelector(".italic")?.textContent).toBe("b");
		expect(text("~~**x**~~").querySelector(".line-through .font-bold")?.textContent).toBe("x");
		expect(text("__**x**__").querySelector(".underline .font-bold")?.textContent).toBe("x");
		expect(text("**__x__**").querySelector(".font-bold .underline")?.textContent).toBe("x");
	});
	it("does not style things that only look like marks", () => {
		const view = text("2 * 3 * 4 and snake_case_name and **unclosed");
		expect(view.querySelector(".font-bold")).toBeNull();
		expect(view.querySelector(".italic")).toBeNull();
		expect(view.textContent).toBe("2 * 3 * 4 and snake_case_name and **unclosed");
	});
});

describe("pages", () => {
	const raw =
		"<!-- page: 2026-11-01 -->\nfirst\n\n<!-- page: 2026-11-03 -->\nsecond\nline\n";

	it("splits dated pages and round-trips exactly", () => {
		const pages = parsePages(raw, "2026-11-09");
		expect(pages.map((p) => p.date)).toEqual(["2026-11-01", "2026-11-03"]);
		expect(pages[1].body).toBe("second\nline\n");
		expect(serializePages(pages)).toBe(raw);
	});
	it("keeps legacy content as one undated page, unchanged", () => {
		const pages = parsePages("# old note\ntext", "2026-11-09");
		expect(pages).toEqual([{ date: null, body: "# old note\ntext" }]);
		expect(serializePages(pages)).toBe("# old note\ntext");
	});
	it("empty file starts with a page dated today", () => {
		expect(parsePages("", "2026-11-09")).toEqual([
			{ date: "2026-11-09", body: "" },
		]);
	});
	it("legacy text before markers becomes an undated first page", () => {
		const pages = parsePages("intro\n<!-- page: 2026-11-03 -->\nbody", "x");
		expect(pages.map((p) => p.date)).toEqual([null, "2026-11-03"]);
		expect(serializePages(pages)).toBe("intro\n<!-- page: 2026-11-03 -->\nbody");
	});
	it("formats dates and hides missing ones", () => {
		expect(formatPageDate("2026-11-03")).toBe("Tuesday, 3 November 2026");
		expect(formatPageDate(null)).toBe("");
	});
});

describe("paginateText", () => {
	const fits = (n: number) => (s: string) => s.length <= n;

	it("leaves text that fits alone", () => {
		expect(paginateText("short", fits(10))).toEqual({
			chunks: ["short"],
			starts: [0],
		});
	});
	it("breaks on whitespace, consuming it, and tracks offsets", () => {
		const r = paginateText("aaaa bbbb cccc", fits(9));
		expect(r.chunks).toEqual(["aaaa bbbb", "cccc"]);
		expect(r.starts).toEqual([0, 10]);
	});
	it("hard-cuts a long word and can make many pages", () => {
		const r = paginateText("x".repeat(25), fits(10));
		expect(r.chunks.map((c) => c.length)).toEqual([10, 10, 5]);
		expect(r.chunks.join("")).toBe("x".repeat(25));
	});
	it("gives up safely when nothing fits", () => {
		expect(paginateText("abc", () => false).chunks).toEqual(["abc"]);
	});
});

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

import type { jsPDF } from "jspdf";
import { describe, expect, it, vi } from "vitest";
import {
	generateIndividualFilePDF,
	stripInlineMarkdown,
	toPdfSafeText,
} from "@src/features/markdown/lib/enhancedPDFGenerator";
import { formatPageDate } from "@src/features/markdown/lib/pages";

interface Drawn {
	text: string;
	x: number;
	y: number;
	font: string;
	style: string;
	size: number;
}

interface Stroke {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

// jsPDF defines `text` and `line` per document, so they cannot be spied on statically.
// A subclass records every call, with the font in use, and then draws as normal.
const recorded = vi.hoisted(() => ({
	drawn: [] as Drawn[],
	strokes: [] as Stroke[],
}));

vi.mock("jspdf", async (importOriginal) => {
	const actual = await importOriginal<typeof import("jspdf")>();
	class RecordingPdf extends actual.jsPDF {
		constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
			super(...args);
			const drawText = this.text.bind(this) as jsPDF["text"];
			const drawLine = this.line.bind(this) as jsPDF["line"];

			this.text = ((...call: Parameters<jsPDF["text"]>) => {
				const [text, x, y] = call;
				const font = this.getFont();
				recorded.drawn.push({
					text: Array.isArray(text) ? text.join(" ") : String(text),
					x: Number(x),
					y: Number(y),
					font: font.fontName,
					style: font.fontStyle,
					size: this.getFontSize(),
				});
				return drawText(...call);
			}) as jsPDF["text"];

			this.line = ((...call: Parameters<jsPDF["line"]>) => {
				const [x1, y1, x2, y2] = call;
				recorded.strokes.push({ x1, y1, x2, y2 });
				return drawLine(...call);
			}) as jsPDF["line"];
		}
	}
	return { ...actual, jsPDF: RecordingPdf, default: RecordingPdf };
});

/** Starts a fresh recording. Call before generating the PDF. */
const capture = () => {
	recorded.drawn.length = 0;
	recorded.strokes.length = 0;
	return recorded;
};

/** What was drawn, one string per line on the page (pieces on the same baseline joined). */
const linesOf = (drawn: Drawn[]): string[] => {
	const byBaseline = new Map<number, string>();
	for (const piece of drawn) {
		byBaseline.set(piece.y, (byBaseline.get(piece.y) ?? "") + piece.text);
	}
	return [...byBaseline.values()];
};

const pieceOf = (drawn: Drawn[], text: string): Drawn => {
	const found = drawn.find((piece) => piece.text.trim() === text);
	if (!found) throw new Error(`Nothing was drawn as "${text}"`);
	return found;
};

describe("stripInlineMarkdown", () => {
	it.each([
		["**bold**", "bold"],
		["*italic*", "italic"],
		["__underline__", "underline"],
		["~~strike~~", "strike"],
		["`code`", "code"],
		["[site](https://example.com)", "site (https://example.com)"],
		["***bold italic***", "bold italic"],
		["**a *b* c**", "a b c"],
		["~~**both**~~", "both"],
		["__**underlined bold**__", "underlined bold"],
		["**__~~all three~~__**", "all three"],
		["[**bold link**](u)", "bold link (u)"],
		["plain **a** and *b* and ~~c~~", "plain a and b and c"],
	])("turns %s into %s", (input, expected) => {
		expect(stripInlineMarkdown(input)).toBe(expected);
	});

	it("keeps the contents of code spans exactly as written", () => {
		expect(stripInlineMarkdown("run `**not bold** ~~x~~` now")).toBe(
			"run **not bold** ~~x~~ now",
		);
		expect(stripInlineMarkdown("**bold `code` more**")).toBe("bold code more");
	});

	it("leaves text that only looks like markup", () => {
		expect(stripInlineMarkdown("snake_case_name")).toBe("snake_case_name");
		expect(stripInlineMarkdown("2 * 3 * 4")).toBe("2 * 3 * 4");
		expect(stripInlineMarkdown("unclosed **bold")).toBe("unclosed **bold");
		expect(stripInlineMarkdown("a ~ b")).toBe("a ~ b");
	});

	it("handles empty text", () => {
		expect(stripInlineMarkdown("")).toBe("");
	});
});

describe("toPdfSafeText", () => {
	it("keeps ASCII and Latin-1 accents and symbols", () => {
		expect(toPdfSafeText("Café Zoë señor © 5 × 3 ½")).toBe("Café Zoë señor © 5 × 3 ½");
		expect(toPdfSafeText("é")).toBe("é");
	});

	it("maps smart punctuation to plain equivalents", () => {
		expect(toPdfSafeText("‘a’ “b” – — … •")).toBe(
			"'a' \"b\" - - ... -",
		);
	});

	it("replaces characters the font cannot show with a visible ?", () => {
		expect(toPdfSafeText("₹100")).toBe("?100");
		expect(toPdfSafeText("hi 😀!")).toBe("hi ?!");
		expect(toPdfSafeText("नमस्ते")).toMatch(/^\?+$/);
	});

	it("drops invisible joiners instead of printing extra question marks", () => {
		expect(toPdfSafeText("a​b")).toBe("ab");
		expect(toPdfSafeText("❤️")).toBe("?");
	});

	it("turns tabs into spaces and drops control characters", () => {
		expect(toPdfSafeText("a\tb")).toBe("a    b");
		expect(toPdfSafeText("a\u0000b\u0085c")).toBe("abc");
	});
});

const DIARY = [
	"<!-- page: 2026-11-03 -->",
	"# **Big** day",
	"## Plan with *style*",
	"- first **item**",
	"  - nested ~~gone~~ item",
	"> a __quoted__ line",
	"~> indented `code` text",
	"Alice: said **hello** there",
	"Plain paragraph with [a link](https://x.test) inside.",
	"```",
	"const a = **raw**;",
	"```",
	"<!-- page: 2026-11-04 -->",
	"Second day, café ₹ 😀",
].join("\n");

describe("generateIndividualFilePDF text", () => {
	it("never prints page markers or inline markup", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({ path: "diary.md", content: DIARY });

		// The code block keeps its text exactly as written, `**raw**` included.
		const all = linesOf(drawn).join("\n").replace("const a = **raw**;", "");
		expect(all).not.toContain("<!--");
		expect(all).not.toContain("-->");
		expect(all).not.toContain("~~");
		expect(all).not.toContain("__");
		expect(all).not.toContain("`");
		expect(all).not.toContain("*");
	});

	it("shows each page's date and the formatted text", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({ path: "diary.md", content: DIARY });

		const lines = linesOf(drawn);
		expect(lines).toContain(formatPageDate("2026-11-03"));
		expect(lines).toContain(formatPageDate("2026-11-04"));
		expect(lines).toContain("Big day");
		expect(lines).toContain("Plan with style");
		expect(lines).toContain("first item");
		expect(lines).toContain("nested gone item");
		expect(lines).toContain("a quoted line");
		expect(lines).toContain("indented code text");
		expect(lines).toContain("Alice:said hello there");
		expect(lines).toContain("Plain paragraph with a link (https://x.test) inside.");
		expect(lines).toContain("const a = **raw**;");
	});

	it("keeps accents and marks characters it cannot draw", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({ path: "diary.md", content: DIARY });

		expect(linesOf(drawn)).toContain("Second day, café ? ?");
	});

	it("prints no date for older content without page markers", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({ path: "old.md", content: "Just some **old** text" });

		expect(linesOf(drawn)).toEqual(["Just some old text"]);
	});

	it("still prints a code block that was never closed", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({ path: "x.md", content: "intro\n```\nlet open = true;" });

		expect(linesOf(drawn)).toContain("let open = true;");
	});

	it("draws an empty file as a blank page", () => {
		const { drawn } = capture();
		const doc = generateIndividualFilePDF({ path: "e.md", content: "  \n" });

		expect(drawn).toEqual([]);
		expect(doc.getNumberOfPages()).toBe(1);
	});

	it("spreads a long file over pages without running past the bottom margin", () => {
		const { drawn } = capture();
		const paragraph = "Word ".repeat(400).trim();
		const content = `<!-- page: 2026-11-03 -->\n${Array.from({ length: 12 }, () => paragraph).join("\n")}`;

		const doc = generateIndividualFilePDF({ path: "long.md", content });

		const bottom = doc.internal.pageSize.getHeight() - 40;
		expect(doc.getNumberOfPages()).toBeGreaterThan(1);
		expect(drawn.every((piece) => piece.y <= bottom)).toBe(true);
	});

	it("keeps wrapped heading lines from overlapping", () => {
		const { drawn } = capture();
		const longHeading = `# ${"Heading ".repeat(30).trim()}`;

		generateIndividualFilePDF({ path: "h.md", content: longHeading });

		const ys = drawn.map((piece) => piece.y);
		expect(ys.length).toBeGreaterThan(1);
		// 16pt text needs more than the 12pt body spacing.
		for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(16);
	});

	it("cuts a word that is wider than the page instead of running off it", () => {
		const { drawn } = capture();
		const doc = generateIndividualFilePDF({ path: "w.md", content: "x".repeat(400) });

		const right = doc.internal.pageSize.getWidth() - 40;
		expect(drawn.length).toBeGreaterThan(1);
		for (const piece of drawn) {
			expect(piece.x + doc.getTextWidth(piece.text)).toBeLessThanOrEqual(right + 0.5);
		}
		expect(drawn.map((piece) => piece.text).join("")).toBe("x".repeat(400));
	});
});

describe("generateIndividualFilePDF styles", () => {
	it("draws bold, italic, bold italic and code in their own fonts", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({
			path: "s.md",
			content: "plain **bold** *italic* ***both*** `mono`",
		});

		expect(pieceOf(drawn, "plain")).toMatchObject({ font: "helvetica", style: "normal" });
		expect(pieceOf(drawn, "bold")).toMatchObject({ font: "helvetica", style: "bold" });
		expect(pieceOf(drawn, "italic")).toMatchObject({ font: "helvetica", style: "italic" });
		expect(pieceOf(drawn, "both")).toMatchObject({ font: "helvetica", style: "bolditalic" });
		expect(pieceOf(drawn, "mono")).toMatchObject({ font: "courier", style: "normal" });
	});

	it("combines nested formats", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({ path: "n.md", content: "**a *b* c**" });

		expect(pieceOf(drawn, "a")).toMatchObject({ style: "bold" });
		expect(pieceOf(drawn, "b")).toMatchObject({ style: "bolditalic" });
		expect(pieceOf(drawn, "c")).toMatchObject({ style: "bold" });
	});

	it("draws a line under underlined text and links, and through struck text", () => {
		const { drawn, strokes } = capture();

		generateIndividualFilePDF({ path: "l.md", content: "__under__ ~~strike~~ [link](u)" });

		expect(strokes).toHaveLength(3);
		expect(strokes.every((s) => s.y1 === s.y2 && s.x2 > s.x1)).toBe(true);

		const under = pieceOf(drawn, "under");
		const struck = pieceOf(drawn, "strike");
		const link = pieceOf(drawn, "link");
		const strokeAt = (piece: Drawn) => strokes.find((s) => Math.abs(s.x1 - piece.x) < 0.01);
		// Underlines sit below the baseline, the strikethrough above it.
		expect(strokeAt(under)!.y1).toBeGreaterThan(under.y);
		expect(strokeAt(link)!.y1).toBeGreaterThan(link.y);
		expect(strokeAt(struck)!.y1).toBeLessThan(struck.y);
	});

	it("draws plain text without any lines", () => {
		const { strokes } = capture();

		generateIndividualFilePDF({ path: "p.md", content: "just words, **bold** and `code`" });

		expect(strokes).toHaveLength(0);
	});

	it("draws headings in bold at their size, and quotes in italic", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({ path: "b.md", content: "# Big\n## Medium\n### Small\n> quoted" });

		expect(pieceOf(drawn, "Big")).toMatchObject({ style: "bold", size: 16 });
		expect(pieceOf(drawn, "Medium")).toMatchObject({ style: "bold", size: 14 });
		expect(pieceOf(drawn, "Small")).toMatchObject({ style: "bold", size: 12 });
		expect(pieceOf(drawn, "quoted")).toMatchObject({ style: "italic" });
	});

	it("keeps styles across wrapped lines", () => {
		const { drawn } = capture();
		const words = Array.from({ length: 120 }, (_, i) => `w${i}`).join(" ");

		generateIndividualFilePDF({ path: "w.md", content: `**${words}**` });

		expect(drawn.length).toBeGreaterThan(1);
		expect(drawn.every((piece) => piece.style === "bold")).toBe(true);
		expect(linesOf(drawn).join(" ")).toBe(words);
	});

	it("labels in a list are drawn with their style", () => {
		const { drawn } = capture();

		generateIndividualFilePDF({
			path: "g.md",
			content: "- **bold** - Use `**text**` for bold text\n- *italic* - Use `*text*` for italic text",
		});

		expect(pieceOf(drawn, "bold")).toMatchObject({ style: "bold" });
		expect(pieceOf(drawn, "italic")).toMatchObject({ style: "italic" });
		// The backticked example keeps its asterisks, in the monospace font.
		expect(pieceOf(drawn, "**text**")).toMatchObject({ font: "courier" });
		expect(linesOf(drawn)).toContain("bold - Use **text** for bold text");
	});
});

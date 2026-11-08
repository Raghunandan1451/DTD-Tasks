// Markdown to PDF for the diary files, using jsPDF's built-in fonts.
import { jsPDF } from "jspdf";
import { File } from "@src/features/markdown/type";
import { formatPageDate, parsePages } from "@src/features/markdown/lib/pages";
import {
	inlineToPlainText,
	parseInlineTree,
	type InlineNode,
} from "@src/lib/utils/inlineMarkdown";

// --- Text helpers ------------------------------------------------------------

/** Typographic characters the built-in fonts lack, mapped to plain equivalents. */
const REPLACEMENTS: Record<string, string> = {
	"‘": "'",
	"’": "'",
	"“": '"',
	"”": '"',
	"–": "-",
	"—": "-",
	"−": "-",
	"•": "-",
	"…": "...",
	"→": "->",
};

/** Zero-width characters, including the joiners and selectors inside emoji. */
const INVISIBLE = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0xfe0e, 0xfe0f]);

/**
 * Makes text safe for the PDF's built-in fonts, which cover Latin-1 only.
 * Latin-1 (accents and common symbols) is kept, familiar punctuation is mapped
 * to plain equivalents, and anything else (emoji, other scripts, ₹ ...) becomes
 * a visible "?" so a gap in the page never goes unnoticed. Each such character
 * is counted once, however many UTF-16 units it takes.
 */
export const toPdfSafeText = (text: string): string => {
	let out = "";
	for (const char of text.normalize("NFC")) {
		const code = char.codePointAt(0) ?? 0;
		if (char === "\t") out += "    ";
		else if (char === "\n" || char === "\r") out += " ";
		else if (INVISIBLE.has(code)) continue;
		else if (code < 0x20 || (code >= 0x7f && code < 0xa0)) continue;
		else if (code <= 0x7e || (code >= 0xa0 && code <= 0xff)) out += char;
		else out += REPLACEMENTS[char] ?? "?";
	}
	return out;
};

/** Inline formats of one stretch of text. */
interface Style {
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strike: boolean;
	code: boolean;
	link: boolean;
}

/** A stretch of text with one set of formats. */
interface Run extends Style {
	text: string;
}

const PLAIN: Style = {
	bold: false,
	italic: false,
	underline: false,
	strike: false,
	code: false,
	link: false,
};

/** Flattens parsed nodes into runs, each carrying every format that applies to it. */
const toRuns = (nodes: readonly InlineNode[], style: Style): Run[] =>
	nodes.flatMap((node): Run[] => {
		switch (node.type) {
			case "text":
				return [{ ...style, text: node.text }];
			case "code":
				return [{ ...style, code: true, text: node.text }];
			case "link":
				// The address stays visible, so a printed page is still useful.
				return [
					...toRuns(node.label, { ...style, link: true }),
					{ ...style, text: ` (${node.href})` },
				];
			case "format":
				return toRuns(node.children, {
					...style,
					bold: style.bold || node.kind === "bold" || node.kind === "bolditalic",
					italic: style.italic || node.kind === "italic" || node.kind === "bolditalic",
					underline: style.underline || node.kind === "underline",
					strike: style.strike || node.kind === "strike",
				});
		}
	});

const parseInline = (text: string, base: Style = PLAIN): Run[] =>
	toRuns(parseInlineTree(text), base);

/** Removes inline markdown and keeps the text. Code spans are kept exactly as written. */
export const stripInlineMarkdown = (text: string): string =>
	inlineToPlainText(parseInlineTree(text));

/** Runs made safe for the font. */
const richText = (text: string, base: Style = PLAIN): Run[] =>
	parseInline(text, base).map((run) => ({ ...run, text: toPdfSafeText(run.text) }));

// --- Layout ------------------------------------------------------------------

const BODY_SIZE = 10;
const HEADING_SIZES = [16, 14, 12] as const;

export const generateIndividualFilePDF = (
	file: Pick<File, "path" | "content">,
): jsPDF => {
	const doc = new jsPDF({ unit: "pt", format: "a4" });

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 40;
	const maxWidth = pageWidth - margin * 2;
	let yPos = margin;

	const applyBodyStyle = (style: "normal" | "bold" | "italic" = "normal") => {
		doc.setFont("helvetica", style);
		doc.setFontSize(BODY_SIZE);
		doc.setTextColor(0);
	};
	applyBodyStyle();

	/** Starts a new page when `height` more points would not fit. */
	const ensureSpace = (height: number) => {
		if (yPos + height > pageHeight - margin) {
			doc.addPage();
			yPos = margin;
		}
	};

	const setRunFont = (run: Run, size: number) => {
		if (run.code) {
			doc.setFont("courier", run.bold ? "bold" : "normal");
			doc.setFontSize(size * 0.9);
		} else {
			const style = run.bold ? (run.italic ? "bolditalic" : "bold") : run.italic ? "italic" : "normal";
			doc.setFont("helvetica", style);
			doc.setFontSize(size);
		}
	};

	interface Token {
		text: string;
		run: Run;
		width: number;
		space: boolean;
	}

	interface RichOptions {
		size: number;
		color: readonly [number, number, number];
		/** Only the first line starts at x; later lines start at the margin. */
		hangingIndent?: boolean;
	}

	/**
	 * Draws formatted text, wrapping it word by word and breaking pages between
	 * lines so a long paragraph never runs off the bottom. Each run is drawn in
	 * its own font: bold, italic, monospace on grey for code, blue for links,
	 * with lines for underline and strikethrough.
	 */
	const drawRich = (runs: Run[], x: number, lineHeight: number, options: RichOptions) => {
		const { size, color, hangingIndent = false } = options;
		const widthFor = (line: number) =>
			maxWidth - ((hangingIndent && line > 0 ? margin : x) - margin);
		const measure = (text: string, run: Run) => {
			setRunFont(run, size);
			return doc.getTextWidth(text);
		};

		// Words and the spaces between them, each measured in its own font.
		const tokens: Token[] = runs.flatMap((run) =>
			run.text
				.split(/(\s+)/)
				.filter(Boolean)
				.map((text): Token => ({
					text,
					run,
					width: measure(text, run),
					space: /^\s+$/.test(text),
				})),
		);

		const lines: Token[][] = [];
		let line: Token[] = [];
		let used = 0;
		const endLine = () => {
			while (line.length > 0 && line[line.length - 1].space) line.pop();
			lines.push(line);
			line = [];
			used = 0;
		};

		for (const token of tokens) {
			if (token.space) {
				if (line.length > 0) {
					line.push(token);
					used += token.width;
				}
				continue;
			}

			let word = token;
			if (used > 0 && used + word.width > widthFor(lines.length)) endLine();

			// A single word wider than a whole line is cut to fit.
			while (word.width > widthFor(lines.length)) {
				let cut = 1;
				while (
					cut < word.text.length &&
					measure(word.text.slice(0, cut + 1), word.run) <= widthFor(lines.length)
				) {
					cut++;
				}
				const head = word.text.slice(0, cut);
				line.push({ ...word, text: head, width: measure(head, word.run) });
				endLine();
				const rest = word.text.slice(cut);
				word = { ...word, text: rest, width: measure(rest, word.run) };
			}

			line.push(word);
			used += word.width;
		}
		if (line.length > 0) endLine();

		lines.forEach((tokensOnLine, index) => {
			ensureSpace(lineHeight);
			let cx = hangingIndent && index > 0 ? margin : x;

			// Neighbouring tokens of one run are drawn together.
			const groups: { run: Run; text: string; width: number }[] = [];
			for (const token of tokensOnLine) {
				const last = groups[groups.length - 1];
				if (last && last.run === token.run) {
					last.text += token.text;
					last.width += token.width;
				} else {
					groups.push({ run: token.run, text: token.text, width: token.width });
				}
			}

			for (const { run, text, width } of groups) {
				setRunFont(run, size);
				const ink = run.link ? ([30, 90, 200] as const) : run.code ? ([60, 60, 60] as const) : color;
				if (run.code) {
					doc.setFillColor(235, 235, 235);
					doc.rect(cx, yPos - size * 0.85, width, size * 1.15, "F");
				}
				doc.setTextColor(ink[0], ink[1], ink[2]);
				doc.text(text, cx, yPos);

				if (run.underline || run.link || run.strike) {
					doc.setDrawColor(ink[0], ink[1], ink[2]);
					doc.setLineWidth(0.5);
					if (run.underline || run.link) doc.line(cx, yPos + 1.5, cx + width, yPos + 1.5);
					if (run.strike) doc.line(cx, yPos - size * 0.3, cx + width, yPos - size * 0.3);
				}
				cx += width;
			}
			yPos += lineHeight;
		});
		applyBodyStyle();
	};

	const BLACK = [0, 0, 0] as const;
	const GREY = [100, 100, 100] as const;

	/** Monospace block on a grey background, wrapped and paginated per line. */
	const drawCode = (codeLines: string[]) => {
		const lineHeight = 12;
		doc.setFont("courier", "normal");
		doc.setFontSize(9);
		doc.setTextColor(60);

		yPos += 4;
		codeLines.forEach((codeLine) => {
			const wrapped: string[] = doc.splitTextToSize(
				toPdfSafeText(codeLine) || " ",
				maxWidth - 16,
			);
			wrapped.forEach((line) => {
				ensureSpace(lineHeight);
				doc.setFillColor(245, 245, 245);
				doc.rect(margin, yPos - 9, maxWidth, lineHeight, "F");
				doc.text(line, margin + 8, yPos);
				yPos += lineHeight;
			});
		});
		yPos += 8;
		applyBodyStyle();
	};

	/** Date heading and a thin rule above each diary page. */
	const drawPageHeader = (date: string, isFirst: boolean) => {
		ensureSpace(40);
		if (!isFirst) yPos += 14;
		doc.setDrawColor(200);
		doc.line(margin, yPos - 10, pageWidth - margin, yPos - 10);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(11);
		doc.setTextColor(70, 90, 140);
		doc.text(toPdfSafeText(date), margin, yPos + 4);
		yPos += 22;
		applyBodyStyle();
	};

	const drawLine = (line: string) => {
		const trimmed = line.trim();

		const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
		if (heading) {
			const size = HEADING_SIZES[heading[1].length - 1];
			yPos += 4;
			drawRich(richText(heading[2], { ...PLAIN, bold: true }), margin, size + 3, {
				size,
				color: BLACK,
			});
			yPos += 3;
			return;
		}

		const quote = trimmed.match(/^>\s?(.*)$/);
		if (quote) {
			drawRich(richText(quote[1], { ...PLAIN, italic: true }), margin + 16, 13, {
				size: BODY_SIZE,
				color: GREY,
			});
			return;
		}

		const indent = trimmed.match(/^~>\s?(.*)$/);
		if (indent) {
			drawRich(richText(indent[1]), margin + 30, 12, {
				size: BODY_SIZE,
				color: BLACK,
				hangingIndent: true,
			});
			yPos += 2;
			return;
		}

		const list = line.match(/^(\s*)[-*]\s+(.*)$/);
		if (list) {
			const level = Math.min(Math.floor(list[1].replace(/\t/g, "  ").length / 2), 4);
			const bulletX = margin + 8 + level * 14;
			ensureSpace(12);
			doc.setFillColor(0, 0, 0);
			doc.circle(bulletX + 2, yPos - 3, 1.3, "F");
			drawRich(richText(list[2]), bulletX + 12, 12, { size: BODY_SIZE, color: BLACK });
			return;
		}

		const dialogue = trimmed.match(/^([A-Z][a-zA-Z\s]+):\s+(.+)$/);
		if (dialogue) {
			ensureSpace(12);
			doc.setFont("helvetica", "bold");
			doc.text(`${toPdfSafeText(dialogue[1])}:`, margin, yPos);
			applyBodyStyle();
			drawRich(richText(dialogue[2]), margin + 80, 12, { size: BODY_SIZE, color: BLACK });
			yPos += 2;
			return;
		}

		if (trimmed) {
			drawRich(richText(trimmed), margin, 12, { size: BODY_SIZE, color: BLACK });
			yPos += 2;
		} else {
			yPos += 6; // Empty line
		}
	};

	/** Renders one page body, tracking fenced code blocks. */
	const drawBody = (body: string) => {
		let inCode = false;
		let codeLines: string[] = [];

		body.split("\n").forEach((line) => {
			if (line.trim().startsWith("```")) {
				if (inCode) {
					drawCode(codeLines);
					codeLines = [];
				}
				inCode = !inCode;
				return;
			}
			if (inCode) codeLines.push(line);
			else drawLine(line);
		});

		// A fence that was never closed still prints what was inside it.
		if (inCode && codeLines.length > 0) drawCode(codeLines);
	};

	if (file.content && file.content.trim()) {
		const pages = parsePages(file.content.replace(/\r\n/g, "\n"));
		pages.forEach((page, index) => {
			// Legacy content without a page marker has no date to show.
			if (page.date) drawPageHeader(formatPageDate(page.date), index === 0);
			else if (index > 0) yPos += 14;
			drawBody(page.body);
		});
	}

	return doc;
};

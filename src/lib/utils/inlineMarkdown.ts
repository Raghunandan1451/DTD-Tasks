/**
 * One parser for inline markdown, shared by the edit-mode highlighter, the
 * preview and the PDF export so they always agree on what is formatted.
 *
 * Marks may nest in any order (`~~__x__~~`, `***x***`, `**a *b* c**`). Code
 * spans are taken literally. Marks that are not closed, or that only look like
 * marks (`2 * 3 * 4`, `snake_case`), stay plain text.
 */

export type FormatKind = "bold" | "italic" | "bolditalic" | "underline" | "strike";

export type InlineNode =
	| { type: "text"; text: string }
	| { type: "code"; text: string }
	| { type: "format"; kind: FormatKind; marker: string; children: InlineNode[] }
	| { type: "link"; label: InlineNode[]; href: string };

// Groups: 1 code, 2 bold italic, 3 bold, 4 underline, 5 strikethrough, 6 italic, 7 link.
const INLINE =
	/(`[^`\n]+`)|(\*\*\*(?=\S)[^\n]+?\*\*\*)|(\*\*(?=\S)[^\n]+?\*\*)|(__(?=\S)[^\n]+?__)|(~~(?=\S)[^\n]+?~~)|(\*(?=\S)[^*\n]*?\S\*)|(\[[^\]\n]+\]\([^)\n]+\))/g;

/** How deep marks may nest before the rest is left as plain text. */
const MAX_DEPTH = 8;

export const parseInlineTree = (text: string, depth: number = 0): InlineNode[] => {
	const nodes: InlineNode[] = [];
	const pushText = (value: string) => {
		if (value) nodes.push({ type: "text", text: value });
	};
	const format = (kind: FormatKind, marker: string, raw: string): InlineNode => ({
		type: "format",
		kind,
		marker,
		children: parseInline(raw.slice(marker.length, -marker.length), depth + 1),
	});

	let last = 0;
	for (const match of text.matchAll(INLINE)) {
		const start = match.index ?? 0;
		const raw = match[0];
		pushText(text.slice(last, start));

		if (match[1]) {
			nodes.push({ type: "code", text: raw.slice(1, -1) });
		} else if (depth >= MAX_DEPTH) {
			pushText(raw);
		} else if (match[2]) {
			nodes.push(format("bolditalic", "***", raw));
		} else if (match[3]) {
			nodes.push(format("bold", "**", raw));
		} else if (match[4]) {
			nodes.push(format("underline", "__", raw));
		} else if (match[5]) {
			nodes.push(format("strike", "~~", raw));
		} else if (match[6]) {
			nodes.push(format("italic", "*", raw));
		} else {
			const split = raw.indexOf("](");
			nodes.push({
				type: "link",
				label: parseInline(raw.slice(1, split), depth + 1),
				href: raw.slice(split + 2, -1),
			});
		}
		last = start + raw.length;
	}
	pushText(text.slice(last));
	return nodes;
};

const parseInline = parseInlineTree;

/** The text with marks removed. Links read `label (address)`. */
export const inlineToPlainText = (nodes: readonly InlineNode[]): string =>
	nodes
		.map((node) => {
			switch (node.type) {
				case "text":
				case "code":
					return node.text;
				case "format":
					return inlineToPlainText(node.children);
				case "link":
					return `${inlineToPlainText(node.label)} (${node.href})`;
			}
		})
		.join("");

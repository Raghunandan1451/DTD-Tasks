// parseMarkdown.ts - block parsing; inline marks come from the shared parser
import { createElement, ReactElement, ReactNode } from "react";
import { parseInlineTree, type InlineNode } from "@src/lib/utils/inlineMarkdown";

const CODE_CLASS =
	"px-2 py-1 rounded text-sm font-mono " +
	"bg-gray-800/60 text-gray-100 dark:bg-gray-100/20 dark:text-gray-200";

/** Turns parsed inline nodes into elements. Nested marks become nested elements. */
const renderInline = (nodes: readonly InlineNode[], keyPrefix: string): ReactNode[] =>
	nodes.map((node, index): ReactNode => {
		const key = `${keyPrefix}-${index}`;
		switch (node.type) {
			case "text":
				return node.text;
			case "code":
				return createElement("code", { key, className: CODE_CLASS }, node.text);
			case "link":
				return createElement(
					"a",
					{
						key,
						href: node.href,
						target: "_blank",
						rel: "noopener noreferrer",
						className: "text-blue-500 hover:underline",
					},
					renderInline(node.label, key)
				);
			case "format": {
				const children = renderInline(node.children, key);
				switch (node.kind) {
					case "bold":
						return createElement("strong", { key }, children);
					case "italic":
						return createElement("em", { key }, children);
					case "bolditalic":
						return createElement("strong", { key }, createElement("em", {}, children));
					case "underline":
						return createElement("u", { key }, children);
					case "strike":
						return createElement("s", { key }, children);
				}
			}
		}
	});

function parseInline(text: string, baseKey: string = ""): ReactNode[] {
	const nodes = renderInline(parseInlineTree(text), baseKey);
	return nodes.length > 0 ? nodes : [text];
}

interface BlockToken {
	type:
		| "heading"
		| "blockquote"
		| "list"
		| "code"
		| "paragraph"
		| "empty"
		| "indented-paragraph"
		| "dialogue";
	level?: number;
	content?: string;
	items?: string[];
	lines?: string[];
	speaker?: string;
}

function tokenizeBlocks(markdown: string): BlockToken[] {
	const lines = markdown.split("\n");
	const tokens: BlockToken[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		// Code blocks
		if (line.trim().startsWith("```")) {
			const codeLines: string[] = [];
			i++;

			while (i < lines.length && !lines[i].trim().startsWith("```")) {
				codeLines.push(lines[i]);
				i++;
			}

			tokens.push({ type: "code", lines: codeLines });
			i++;
			continue;
		}

		// Headings
		const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
		if (headingMatch) {
			tokens.push({
				type: "heading",
				level: headingMatch[1].length,
				content: headingMatch[2],
			});
			i++;
			continue;
		}

		// Lists
		if (line.match(/^[-*]\s+/)) {
			const items: string[] = [];
			while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
				items.push(lines[i].replace(/^[-*]\s+/, ""));
				i++;
			}
			tokens.push({ type: "list", items });
			continue;
		}

		// Blockquotes
		if (line.match(/^>\s*/)) {
			const quoteLines: string[] = [];
			while (i < lines.length && lines[i].match(/^>\s*/)) {
				quoteLines.push(lines[i].replace(/^>\s*/, ""));
				i++;
			}
			tokens.push({ type: "blockquote", lines: quoteLines });
			continue;
		}

		// NOVEL DIALOGUE: "Name: Dialog text"
		const dialogueMatch = line.match(/^([A-Z][a-zA-Z0-9_-\s]+):\s+(.+)$/);
		if (dialogueMatch) {
			tokens.push({
				type: "dialogue",
				speaker: dialogueMatch[1],
				content: dialogueMatch[2],
			});
			i++;
			continue;
		}

		// INDENTED PARAGRAPH: Start with ~>
		if (line.match(/^~>\s*/)) {
			tokens.push({
				type: "indented-paragraph",
				content: line.replace(/^~>\s*/, ""),
			});
			i++;
			continue;
		}

		// Empty lines
		if (line.trim() === "") {
			tokens.push({ type: "empty" });
			i++;
			continue;
		}

		// Regular paragraph
		tokens.push({ type: "paragraph", content: line });
		i++;
	}

	return tokens;
}

export function parseMarkdown(markdown: string): ReactElement[] {
	const tokens = tokenizeBlocks(markdown);
	const elements: ReactElement[] = [];

	tokens.forEach((token, tokenIndex) => {
		const key = `block-${tokenIndex}`;

		switch (token.type) {
			case "heading": {
				const Tag = `h${token.level}` as "h1" | "h2" | "h3";
				const className =
					token.level === 1
						? "text-2xl font-bold mb-2"
						: token.level === 2
						? "text-xl font-semibold mb-2"
						: "text-lg font-medium mb-1";

				elements.push(
					createElement(
						Tag,
						{ key, className },
						parseInline(token.content || "", key)
					)
				);
				break;
			}

			case "list": {
				const listItems = token.items?.map((item, itemIndex) =>
					createElement(
						"li",
						{ key: `${key}-item-${itemIndex}`, className: "ml-4" },
						parseInline(item, `${key}-item-${itemIndex}`)
					)
				);
				elements.push(
					createElement(
						"ul",
						{ key, className: "list-disc mb-2" },
						listItems
					)
				);
				break;
			}

			case "blockquote": {
				const content = token.lines?.join("\n") || "";
				elements.push(
					createElement(
						"blockquote",
						{
							key,
							className:
								"my-4 py-2 italic text-gray-700 dark:text-gray-300 text-center",
						},
						parseInline(content, key)
					)
				);
				break;
			}

			case "code": {
				const content = token.lines?.join("\n") || "";
				elements.push(
					createElement(
						"pre",
						{
							key,
							className:
								"p-4 rounded-lg font-mono text-sm " +
								"bg-gray-800/60 text-gray-100 dark:bg-gray-100/20 dark:text-gray-200",
						},
						createElement(
							"code",
							{ className: "font-mono" },
							content
						)
					)
				);
				break;
			}

			case "indented-paragraph": {
				// Book-style paragraph with first-line indent
				elements.push(
					createElement(
						"p",
						{
							key,
							className: "mb-2 indent-8",
						},
						parseInline(token.content || "", key)
					)
				);
				break;
			}

			case "dialogue": {
				// Novel-style dialogue
				elements.push(
					createElement(
						"div",
						{
							key,
							className: "grid grid-cols-[150px_1fr] gap-4 mb-2",
						},
						[
							createElement(
								"div",
								{
									key: `${key}-speaker`,
									className:
										"text-center font-semibold text-gray-700 dark:text-gray-300",
								},
								token.speaker
							),
							createElement(
								"div",
								{
									key: `${key}-content`,
									className:
										"text-gray-900 dark:text-gray-100",
								},
								parseInline(token.content || "", key)
							),
						]
					)
				);
				break;
			}

			case "empty": {
				elements.push(createElement("br", { key }));
				break;
			}

			case "paragraph":
			default: {
				elements.push(
					createElement(
						"p",
						{ key, className: "mb-2" },
						parseInline(token.content || "", key)
					)
				);
				break;
			}
		}
	});

	return elements;
}

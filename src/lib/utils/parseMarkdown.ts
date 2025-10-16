// parseMarkdown.ts - Updated with combination support
import { createElement, ReactElement, ReactNode } from "react";

interface MarkdownRule {
	pattern: RegExp;
	component: (key: string, ...matches: string[]) => ReactElement;
}

const INLINE_RULES: readonly MarkdownRule[] = [
	// Bold + Italic + Strikethrough + Underline (all four)
	{
		pattern: /\*\*_~~__([^_~*]+)__~~_\*\*/g,
		component: (key, content) =>
			createElement(
				"strong",
				{ key },
				createElement(
					"em",
					{},
					createElement("s", {}, createElement("u", {}, content))
				)
			),
	},

	// Bold + Italic + Strikethrough
	{
		pattern: /\*\*\*~~([^~*]+)~~\*\*\*/g,
		component: (key, content) =>
			createElement(
				"strong",
				{ key },
				createElement("em", {}, createElement("s", {}, content))
			),
	},
	{
		pattern: /\*\*_~~([^~*]+)~~_\*\*/g,
		component: (key, content) =>
			createElement(
				"strong",
				{ key },
				createElement("em", {}, createElement("s", {}, content))
			),
	},

	// Bold + Italic + Underline
	{
		pattern: /\*\*\*__([^_*]+)__\*\*\*/g,
		component: (key, content) =>
			createElement(
				"strong",
				{ key },
				createElement("em", {}, createElement("u", {}, content))
			),
	},
	{
		pattern: /\*\*___([^_*]+)___\*\*/g,
		component: (key, content) =>
			createElement(
				"strong",
				{ key },
				createElement("em", {}, createElement("u", {}, content))
			),
	},

	// Bold + Underline + Strikethrough
	{
		pattern: /\*\*__~~([^~_*]+)~~__\*\*/g,
		component: (key, content) =>
			createElement(
				"strong",
				{ key },
				createElement("u", {}, createElement("s", {}, content))
			),
	},

	// Italic + Underline + Strikethrough
	{
		pattern: /\*__~~([^~_*]+)~~__\*/g,
		component: (key, content) =>
			createElement(
				"em",
				{ key },
				createElement("u", {}, createElement("s", {}, content))
			),
	},

	// Bold + Italic
	{
		pattern: /\*\*\*([^*]+)\*\*\*/g,
		component: (key, content) =>
			createElement("strong", { key }, createElement("em", {}, content)),
	},
	{
		pattern: /\*\*_([^_*]+)_\*\*/g,
		component: (key, content) =>
			createElement("strong", { key }, createElement("em", {}, content)),
	},

	// Bold + Underline
	{
		pattern: /\*\*__([^_*]+)__\*\*/g,
		component: (key, content) =>
			createElement("strong", { key }, createElement("u", {}, content)),
	},

	// Bold + Strikethrough
	{
		pattern: /\*\*~~([^~*]+)~~\*\*/g,
		component: (key, content) =>
			createElement("strong", { key }, createElement("s", {}, content)),
	},

	// Bold + Code
	{
		pattern: /\*\*`([^`*]+)`\*\*/g,
		component: (key, content) =>
			createElement(
				"strong",
				{ key },
				createElement(
					"code",
					{
						className:
							"px-2 py-1 rounded text-sm font-mono " +
							"bg-gray-800/60 text-gray-100 dark:bg-gray-100/20 dark:text-gray-200",
					},
					content
				)
			),
	},

	// Italic + Underline
	{
		pattern: /\*__([^_*]+)__\*/g,
		component: (key, content) =>
			createElement("em", { key }, createElement("u", {}, content)),
	},

	// Italic + Strikethrough
	{
		pattern: /\*~~([^~*]+)~~\*/g,
		component: (key, content) =>
			createElement("em", { key }, createElement("s", {}, content)),
	},

	// Italic + Code
	{
		pattern: /\*`([^`*]+)`\*/g,
		component: (key, content) =>
			createElement(
				"em",
				{ key },
				createElement(
					"code",
					{
						className:
							"px-2 py-1 rounded text-sm font-mono " +
							"bg-gray-800/60 text-gray-100 dark:bg-gray-100/20 dark:text-gray-200",
					},
					content
				)
			),
	},

	// Underline + Strikethrough
	{
		pattern: /__~~([^~_]+)~~__/g,
		component: (key, content) =>
			createElement("u", { key }, createElement("s", {}, content)),
	},

	// Underline + Code
	{
		pattern: /__`([^`_]+)`__/g,
		component: (key, content) =>
			createElement(
				"u",
				{ key },
				createElement(
					"code",
					{
						className:
							"px-2 py-1 rounded text-sm font-mono " +
							"bg-gray-800/60 text-gray-100 dark:bg-gray-100/20 dark:text-gray-200",
					},
					content
				)
			),
	},

	// Strikethrough + Code
	{
		pattern: /~~`([^`~]+)`~~/g,
		component: (key, content) =>
			createElement(
				"s",
				{ key },
				createElement(
					"code",
					{
						className:
							"px-2 py-1 rounded text-sm font-mono " +
							"bg-gray-800/60 text-gray-100 dark:bg-gray-100/20 dark:text-gray-200",
					},
					content
				)
			),
	},

	// SINGLE FORMATTING (Original rules - must come after combinations)
	{
		pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
		component: (key, text, href) =>
			createElement(
				"a",
				{
					key,
					href,
					target: "_blank",
					rel: "noopener noreferrer",
					className: "text-blue-500 hover:underline",
				},
				text
			),
	},
	{
		pattern: /`([^`]+)`/g,
		component: (key, content) =>
			createElement(
				"code",
				{
					key,
					className:
						"px-2 py-1 rounded text-sm font-mono " +
						"bg-gray-800/60 text-gray-100 dark:bg-gray-100/20 dark:text-gray-200",
				},
				content
			),
	},
	{
		pattern: /\*\*(?!\*)([^*]+?)\*\*(?!\*)/g,
		component: (key, content) => createElement("strong", { key }, content),
	},
	{
		pattern: /__(?!_)([^_]+?)__(?!_)/g,
		component: (key, content) => createElement("u", { key }, content),
	},
	{
		pattern: /~~(?!~)([^~]+?)~~(?!~)/g,
		component: (key, content) => createElement("s", { key }, content),
	},
	{
		pattern: /(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g,
		component: (key, content) => createElement("em", { key }, content),
	},
];

// Rest of the code remains the same...
function parseInline(text: string, baseKey: string = ""): ReactNode[] {
	let processedText = text;
	const replacements: Array<{ placeholder: string; node: ReactNode }> = [];
	let placeholderIndex = 0;

	INLINE_RULES.forEach((rule, ruleIndex) => {
		const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

		processedText = processedText.replace(regex, (_match, ...args) => {
			const captures = args.slice(0, -2);

			const key = `${baseKey}-r${ruleIndex}-${placeholderIndex}`;
			const node = rule.component(key, ...captures);

			const placeholder = `\u0000PLACEHOLDER_${placeholderIndex}\u0000`;
			replacements.push({ placeholder, node });
			placeholderIndex++;

			return placeholder;
		});
	});

	const nodes: ReactNode[] = [];
	// eslint-disable-next-line no-control-regex
	const parts = processedText.split(/(\u0000PLACEHOLDER_\d+\u0000)/);

	parts.forEach((part) => {
		if (part.startsWith("\u0000PLACEHOLDER_")) {
			const replacement = replacements.find(
				(r) => r.placeholder === part
			);
			if (replacement) {
				nodes.push(replacement.node);
			}
		} else if (part) {
			nodes.push(part);
		}
	});

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

import { createElement, ReactElement, ReactNode } from 'react';

const VOID_ELEMENTS = new Set(['br', 'hr', 'img', 'input', 'link', 'meta']);

interface MarkdownRule {
	pattern: RegExp;
	component: (content: string, key: string) => ReactElement;
}

const MARKDOWN_RULES: Readonly<MarkdownRule[]> = Object.freeze([
	{
		pattern: /\*\*__(\S(?:.*?\S)?)__\*\*/g, // **__Bold + Underline__**
		component: (content, key) =>
			createElement('strong', { key }, createElement('u', null, content)),
	},
	{
		pattern: /__\*\*(\S(?:.*?\S)?)\*\*__/g, // __**Underline + Bold**__
		component: (content, key) =>
			createElement('u', { key }, createElement('strong', null, content)),
	},
	{
		pattern: /\*\*\*(\S(?:.*?\S)?)\*\*\*/g, // ***Bold + Italic***
		component: (content, key) =>
			createElement(
				'strong',
				{ key },
				createElement('em', null, content)
			),
	},
	{
		pattern: /\*__(\S(?:.*?\S)?)__\*/g, // *__Italic + Underline__*
		component: (content, key) =>
			createElement('em', { key }, createElement('u', null, content)),
	},
	{
		pattern: /__\*(\S(?:.*?\S)?)\*__/g, // __*Underline + Italic*__
		component: (content, key) =>
			createElement('u', { key }, createElement('em', null, content)),
	},
	{
		pattern: /\*\*~(\S(?:.*?\S)?)~\*\*/g, // **~Bold + Strikethrough~**
		component: (content, key) =>
			createElement('strong', { key }, createElement('s', null, content)),
	},
	{
		pattern: /~\*\*(\S(?:.*?\S)?)\*\*~/g, // ~**Strikethrough + Bold**~
		component: (content, key) =>
			createElement('s', { key }, createElement('strong', null, content)),
	},
	{
		pattern: /~\*(\S(?:.*?\S)?)\*~/g, // ~*Strikethrough + Italic*~
		component: (content, key) =>
			createElement('s', { key }, createElement('em', null, content)),
	},
	{
		pattern: /~__(\S(?:.*?\S)?)__~/g, // ~__Strikethrough + Underline__~
		component: (content, key) =>
			createElement('s', { key }, createElement('u', null, content)),
	},
	{
		pattern: /__~(\S(?:.*?\S)?)~__/g, // ~__Strikethrough + Underline__~
		component: (content, key) =>
			createElement('u', { key }, createElement('s', null, content)),
	},
	{
		pattern: /\*\*(\S(?:.*?\S)?)\*\*/g,
		component: (content, key) => createElement('strong', { key }, content),
	},
	{
		pattern: /__(\S(?:.*?\S)?)__/g,
		component: (content, key) => createElement('u', { key }, content),
	},
	{
		pattern: /\*(\S(?:.*?\S)?)\*/g,
		component: (content, key) => createElement('em', { key }, content),
	},
	{
		pattern: /~(\S(?:.*?\S)?)~/g,
		component: (content, key) => createElement('s', { key }, content),
	},
	{
		pattern: /`(\S(?:.*?\S)?)`/g,
		component: (content, key) =>
			createElement(
				'code',
				{ key, className: 'bg-gray-700 px-1 rounded-sm' },
				content
			),
	},
]);

type ElemenType = 'p' | 'h1' | 'h2' | 'h3' | 'li' | 'blockquote' | 'br';

type ClassNameMapType = {
	[key in ElemenType]: string | null;
};

export const parseMarkdown = (markdown: string): ReactElement[] => {
	const lines = markdown.split('\n');
	const elements: ReactElement[] = [];

	const classNameMap: ClassNameMapType = {
		h1: 'text-2xl font-bold mb-2',
		h2: 'text-xl font-semibold mb-2',
		h3: 'text-lg font-medium mb-2',
		li: 'ml-4 list-disc mb-1',
		blockquote: 'border-l-4 border-gray-500 pl-4 my-2 italic text-gray-300',
		p: 'text-base mb-2',
		br: null,
	};
	// Parse inline markdown formatting for a given text line.
	const parseInline = (text: string, lineIndex: number): ReactNode[] => {
		return MARKDOWN_RULES.reduce(
			(
				inlineElements: ReactNode[],
				rule: MarkdownRule,
				ruleIndex: number
			) => {
				return inlineElements.flatMap((part) => {
					if (typeof part !== 'string') return part;

					const parts = [];
					let lastIndex = 0;
					let matchCount = 0;
					rule.pattern.lastIndex = 0;

					let match;
					while ((match = rule.pattern.exec(part)) !== null) {
						if (match.index > lastIndex) {
							parts.push(part.slice(lastIndex, match.index));
						}
						const key = `line-${lineIndex}-rule-${ruleIndex}-match-${matchCount++}`;
						parts.push(rule.component(match[1], key));
						lastIndex = rule.pattern.lastIndex;
					}

					if (lastIndex < part.length) {
						parts.push(part.slice(lastIndex));
					}
					return parts;
				});
			},
			[text]
		);
	};
	lines.forEach((line, lineIndex) => {
		const lineKey = `line-${lineIndex}-${line.replace(/\W/g, '')}`;

		// Define mappings for markdown syntax to HTML elements
		const elementMapping: {
			pattern: RegExp;
			type: ElemenType;
			slice: number;
		}[] = [
			{ pattern: /^#\s/, type: 'h1', slice: 2 },
			{ pattern: /^##\s/, type: 'h2', slice: 3 },
			{ pattern: /^###\s/, type: 'h3', slice: 4 },
			{ pattern: /^-\s/, type: 'li', slice: 2 },
			{ pattern: /^>\s/, type: 'blockquote', slice: 2 },
			{ pattern: /^\s*$/, type: 'br', slice: 0 },
		];

		// Determine the element type and extract content
		const match = elementMapping.find(({ pattern }) => pattern.test(line));
		const elementType: ElemenType = match ? match.type : 'p';
		const content = match ? line.slice(match.slice) : line;

		// Parse inline content unless it's a void element (like `<br>`)
		const children = VOID_ELEMENTS.has(elementType)
			? null
			: parseInline(content, lineIndex);

		// Create and add the React element
		elements.push(
			createElement(
				elementType,
				{ key: lineKey, className: classNameMap[elementType] },
				children
			)
		);
	});

	return elements;
};

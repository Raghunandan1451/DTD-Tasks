import { createElement } from 'react';

const VOID_ELEMENTS = new Set(['br', 'hr', 'img', 'input', 'link', 'meta']);

const MARKDOWN_RULES = Object.freeze([
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
				{ key, className: 'bg-gray-700 px-1 rounded' },
				content
			),
	},
]);

export const parseMarkdown = (markdown) => {
	const lines = markdown.split('\n');
	const elements = [];
	let inCodeBlock = false;
	let codeBlockContent = [];
	let codeBlockId = 0;

	// Parse inline markdown formatting for a given text line.
	const parseInline = (text, lineIndex) =>
		MARKDOWN_RULES.reduce(
			(inlineElements, rule, ruleIndex) => {
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

	lines.forEach((line, lineIndex) => {
		const lineKey = `line-${lineIndex}-${line.replace(/\W/g, '')}`;

		// Rest of the markdown parsing remains the same
		let elementType = 'p';
		let content = line;
		const classNameMap = {
			h1: 'text-2xl font-bold mb-2',
			h2: 'text-xl font-semibold mb-2',
			h3: 'text-lg font-medium mb-2',
			li: 'ml-4 list-disc mb-1',
			blockquote:
				'border-l-4 border-gray-500 pl-4 my-2 italic text-gray-300',
			p: 'text-base mb-2',
			br: null,
		};

		if (line.startsWith('# ')) {
			elementType = 'h1';
			content = line.slice(2);
		} else if (line.startsWith('## ')) {
			elementType = 'h2';
			content = line.slice(3);
		} else if (line.startsWith('### ')) {
			elementType = 'h3';
			content = line.slice(4);
		} else if (line.startsWith('- ')) {
			elementType = 'li';
			content = line.slice(2);
		} else if (line.startsWith('> ')) {
			elementType = 'blockquote';
			content = line.slice(2);
		} else if (line.trim() === '') {
			elementType = 'br';
		}

		const children = VOID_ELEMENTS.has(elementType)
			? null
			: parseInline(content, lineIndex);
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

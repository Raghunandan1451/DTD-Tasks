// utils/syntaxHighlighter.js
import { createElement } from 'react';

const CODE_SYNTAX_RULES = [
	{
		pattern: /(\b(const|let|var|function|return|if|else|for|while)\b)/g,
		color: '#FF5722',
	},
	{ pattern: /(["'].*?["'])/g, color: '#9C27B0' },
	{ pattern: /(\[.*?\])/g, color: '#FF9800' },
	{ pattern: /(\(.*?\))/g, color: '#4CAF50' },
	{ pattern: /(\{.*?\})/g, color: '#E91E63' },
	{ pattern: /(=+)/g, color: '#2196F3' },
];

export const highlightCodeSyntax = (code, codeBlockId) => {
	//   let elements = [];
	let remainingCode = code;

	CODE_SYNTAX_RULES.forEach(({ pattern, color }, ruleIndex) => {
		const newParts = [];
		let lastIndex = 0;

		const matches = [...remainingCode.matchAll(pattern)];

		matches.forEach((match) => {
			const [fullMatch] = match;
			const start = match.index;
			const end = start + fullMatch.length;

			if (start > lastIndex) {
				newParts.push(remainingCode.slice(lastIndex, start));
			}

			newParts.push(
				createElement(
					'span',
					{
						key: `cb-${codeBlockId}-rule-${ruleIndex}-${start}`,
						style: { color },
					},
					fullMatch
				)
			);

			lastIndex = end;
		});

		if (newParts.length > 0) {
			if (lastIndex < remainingCode.length) {
				newParts.push(remainingCode.slice(lastIndex));
			}
			remainingCode = newParts;
		}
	});

	return Array.isArray(remainingCode)
		? remainingCode
		: [
				createElement(
					'span',
					{ key: `cb-${codeBlockId}-plain` },
					remainingCode
				),
		  ];
};

import { Fragment, ReactNode } from "react";
import {
	parseInlineTree,
	type FormatKind,
	type InlineNode,
} from "@src/lib/utils/inlineMarkdown";

/**
 * Inline-styles markdown *in place* for the diary editor (Discord-style):
 * the characters are never added, removed or resized, only coloured/weighted,
 * so the output lines up exactly with the transparent <textarea> on top of it.
 */

const MARK = "text-gray-500 dark:text-gray-500";

const FORMAT_CLASS: Record<FormatKind, string> = {
	bold: "font-bold",
	italic: "italic",
	bolditalic: "font-bold italic",
	underline: "underline",
	strike: "line-through",
};

function renderNodes(nodes: readonly InlineNode[], keyPrefix: string): ReactNode[] {
	return nodes.map((node, index): ReactNode => {
		const key = `${keyPrefix}-${index}`;
		switch (node.type) {
			case "text":
				return node.text;
			case "code":
				return (
					<span
						key={key}
						className="rounded bg-gray-500/25 text-gray-900 dark:text-gray-100"
					>
						{`\`${node.text}\``}
					</span>
				);
			case "format":
				return (
					<Fragment key={key}>
						<span className={MARK}>{node.marker}</span>
						<span className={FORMAT_CLASS[node.kind]}>
							{renderNodes(node.children, key)}
						</span>
						<span className={MARK}>{node.marker}</span>
					</Fragment>
				);
			case "link":
				return (
					<Fragment key={key}>
						<span className={MARK}>[</span>
						<span className="text-blue-500">{renderNodes(node.label, key)}</span>
						<span className={MARK}>{`](${node.href})`}</span>
					</Fragment>
				);
		}
	});
}

export function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
	return renderNodes(parseInlineTree(text), keyPrefix);
}

const HEADING_CLASS = [
	"",
	"font-bold text-blue-500 dark:text-blue-400",
	"font-semibold text-blue-500 dark:text-blue-400",
	"font-medium text-blue-500 dark:text-blue-400",
];

export function renderLine(
	line: string,
	index: number,
	inCode: boolean,
): ReactNode {
	const key = `l${index}`;

	if (inCode) {
		return (
			<span key={key} className="bg-gray-500/20 font-mono">
				{line}
			</span>
		);
	}

	const heading = line.match(/^(#{1,3})(\s+)(.*)$/);
	if (heading) {
		return (
			<span key={key} className={HEADING_CLASS[heading[1].length]}>
				<span className={MARK}>
					{heading[1]}
					{heading[2]}
				</span>
				{renderInline(heading[3], key)}
			</span>
		);
	}

	const quote = line.match(/^(>\s?)(.*)$/);
	if (quote) {
		return (
			<span key={key} className="italic text-gray-500 dark:text-gray-400">
				<span className="text-blue-500">{quote[1]}</span>
				{renderInline(quote[2], key)}
			</span>
		);
	}

	const list = line.match(/^(\s*[-*]\s+)(.*)$/);
	if (list) {
		return (
			<span key={key}>
				<span className="font-bold text-blue-500">{list[1]}</span>
				{renderInline(list[2], key)}
			</span>
		);
	}

	const indent = line.match(/^(~>\s?)(.*)$/);
	if (indent) {
		return (
			<span key={key}>
				<span className={MARK}>{indent[1]}</span>
				{renderInline(indent[2], key)}
			</span>
		);
	}

	return <span key={key}>{renderInline(line, key)}</span>;
}

/** Highlights a whole document. Lines are joined with real "\n" characters. */
export function highlightMarkdown(source: string): ReactNode[] {
	const out: ReactNode[] = [];
	let inCode = false;

	source.split("\n").forEach((line, i, all) => {
		const isFence = line.trim().startsWith("```");
		if (isFence) {
			out.push(
				<span key={`l${i}`} className="bg-gray-500/20 font-mono text-gray-500">
					{line}
				</span>,
			);
			inCode = !inCode;
		} else {
			out.push(renderLine(line, i, inCode));
		}
		if (i < all.length - 1) out.push("\n");
	});

	return out;
}

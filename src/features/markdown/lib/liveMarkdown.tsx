import { Fragment, ReactNode } from "react";

/**
 * Inline-styles markdown *in place* for the diary editor (Discord-style):
 * the characters are never added, removed or resized, only coloured/weighted,
 * so the output lines up exactly with the transparent <textarea> on top of it.
 */

const MARK = "text-gray-500 dark:text-gray-500";

const INLINE =
	/(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(__[^_\n]+?__)|(~~[^~\n]+?~~)|(\*[^*\n]+?\*)|(\[[^\]\n]+\]\([^)\n]+\))/g;

function wrap(
	open: string,
	inner: string,
	close: string,
	className: string,
	key: string,
	depth: number,
): ReactNode {
	return (
		<Fragment key={key}>
			<span className={MARK}>{open}</span>
			<span className={className}>{renderInline(inner, key, depth + 1)}</span>
			<span className={MARK}>{close}</span>
		</Fragment>
	);
}

export function renderInline(
	text: string,
	keyPrefix = "i",
	depth = 0,
): ReactNode[] {
	const nodes: ReactNode[] = [];
	let last = 0;
	let n = 0;

	for (const m of text.matchAll(INLINE)) {
		const start = m.index ?? 0;
		if (start > last) nodes.push(text.slice(last, start));
		const raw = m[0];
		const key = `${keyPrefix}-${n++}`;

		if (m[1]) {
			nodes.push(
				<span
					key={key}
					className="rounded bg-gray-500/25 text-gray-900 dark:text-gray-100"
				>
					{raw}
				</span>,
			);
		} else if (depth > 2) {
			nodes.push(raw);
		} else if (m[2]) {
			nodes.push(wrap("**", raw.slice(2, -2), "**", "font-bold", key, depth));
		} else if (m[3]) {
			nodes.push(wrap("__", raw.slice(2, -2), "__", "underline", key, depth));
		} else if (m[4]) {
			nodes.push(
				wrap("~~", raw.slice(2, -2), "~~", "line-through", key, depth),
			);
		} else if (m[5]) {
			nodes.push(wrap("*", raw.slice(1, -1), "*", "italic", key, depth));
		} else if (m[6]) {
			const split = raw.indexOf("](");
			nodes.push(
				<Fragment key={key}>
					<span className={MARK}>[</span>
					<span className="text-blue-500">{raw.slice(1, split)}</span>
					<span className={MARK}>{raw.slice(split)}</span>
				</Fragment>,
			);
		}
		last = start + raw.length;
	}

	if (last < text.length) nodes.push(text.slice(last));
	return nodes;
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

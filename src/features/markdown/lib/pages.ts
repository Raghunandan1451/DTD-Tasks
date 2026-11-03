import { format } from "date-fns";

/**
 * A markdown file is stored as plain text. Each diary page starts with a
 * marker line holding the day it was added:
 *
 *   <!-- page: 2026-11-03 -->
 *   ...page body...
 *
 * Text before the first marker (older files) becomes one undated page, so
 * existing content is never altered until it is edited.
 */
export interface DiaryPage {
	/** yyyy-MM-dd, or null for legacy content that predates page markers. */
	date: string | null;
	body: string;
}

const MARKER = /^<!-- page: (\d{4}-\d{2}-\d{2}) -->\n?/gm;

export const todayKey = (d: Date = new Date()): string => format(d, "yyyy-MM-dd");

export function parsePages(content: string, today: string = todayKey()): DiaryPage[] {
	if (content.trim() === "") return [{ date: today, body: "" }];

	const matches = [...content.matchAll(MARKER)];
	if (matches.length === 0) return [{ date: null, body: content }];

	// One "\n" joins pages; drop it so serialize(parse(x)) === x.
	const trim = (s: string, hasNext: boolean) =>
		hasNext && s.endsWith("\n") ? s.slice(0, -1) : s;

	const pages: DiaryPage[] = [];
	const first = matches[0].index ?? 0;
	if (first > 0) pages.push({ date: null, body: trim(content.slice(0, first), true) });

	matches.forEach((m, i) => {
		const start = (m.index ?? 0) + m[0].length;
		const next = matches[i + 1]?.index;
		const raw = content.slice(start, next ?? content.length);
		pages.push({ date: m[1], body: trim(raw, next !== undefined) });
	});
	return pages;
}

export function serializePages(pages: DiaryPage[]): string {
	return pages
		.map((p) => (p.date ? `<!-- page: ${p.date} -->\n` : "") + p.body)
		.join("\n");
}

/** "Tuesday, 3 November 2026", or "" for undated legacy pages. */
export function formatPageDate(date: string | null): string {
	if (!date) return "";
	const d = new Date(`${date}T00:00:00`);
	return Number.isNaN(d.getTime()) ? date : format(d, "EEEE, d MMMM yyyy");
}

export interface PaginatedText {
	chunks: string[];
	/** Offset in the original text where each chunk begins. */
	starts: number[];
}

/**
 * Splits `text` into chunks that each satisfy `fits` (a layout measurement
 * supplied by the caller). Breaks prefer the last space/newline in the second
 * half of what fits, and that whitespace character is consumed by the break.
 */
export function paginateText(
	text: string,
	fits: (s: string) => boolean,
	maxChunks = 200,
): PaginatedText {
	const chunks: string[] = [];
	const starts: number[] = [];
	let offset = 0;
	let rest = text;

	for (;;) {
		if (fits(rest) || chunks.length >= maxChunks - 1) {
			chunks.push(rest);
			starts.push(offset);
			break;
		}

		// Largest prefix length that still fits (fits is monotonic).
		let lo = 0;
		let hi = rest.length - 1;
		while (lo < hi) {
			const mid = Math.ceil((lo + hi) / 2);
			if (fits(rest.slice(0, mid))) lo = mid;
			else hi = mid - 1;
		}

		if (lo === 0) {
			// Not even one character fits (e.g. the page is not laid out): leave as is.
			chunks.push(rest);
			starts.push(offset);
			break;
		}

		const ws = Math.max(rest.lastIndexOf("\n", lo), rest.lastIndexOf(" ", lo));
		const headLen = ws > lo / 2 ? ws : lo;
		const skip = headLen === ws && ws > lo / 2 ? 1 : 0;

		chunks.push(rest.slice(0, headLen));
		starts.push(offset);
		offset += headLen + skip;
		rest = rest.slice(headLen + skip);
	}

	return { chunks, starts };
}

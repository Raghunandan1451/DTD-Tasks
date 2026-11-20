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

/** True when `text` ends a sentence or a line, so a following page starts something new. */
const endsThought = (text: string): boolean =>
	/\n$/.test(text) || /[.!?:]["')\]]*$/.test(text);

/** The text between two pages that are being joined into one. */
const joinBodies = (previous: string, next: string): string => {
	if (previous === "") return next;
	if (next === "") return previous;
	// An old automatic split removed one space or newline at the break and nobody
	// knows which: mid-sentence it was almost surely a space.
	return previous + (endsThought(previous) ? "\n" : " ") + next;
};

export interface MergeResult {
	pages: DiaryPage[];
	/** How many pages disappeared into a neighbour. 0 means nothing to merge. */
	merged: number;
}

/**
 * Joins pages that sit next to each other and carry the same date, in order.
 * Older versions cut text into pages to fit the screen they were typed on and
 * dated every cut with that day, so those pieces are the ones that match.
 * Undated pages, pages from different days and pages that are not neighbours
 * (day 1, day 2, day 1) are never touched.
 */
export function mergeSameDayPages(pages: DiaryPage[]): MergeResult {
	const out: DiaryPage[] = [];
	for (const page of pages) {
		const last = out[out.length - 1];
		if (last && page.date !== null && last.date === page.date) {
			out[out.length - 1] = { date: last.date, body: joinBodies(last.body, page.body) };
		} else {
			out.push({ ...page });
		}
	}
	return { pages: out, merged: pages.length - out.length };
}

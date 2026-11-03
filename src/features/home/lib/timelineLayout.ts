import type { MarkdownAction } from "@src/lib/db/types";
import { parseISODate } from "@src/lib/utils/isoDate";
import type {
	ExpenseDayTotals,
	ExpenseTimelineItem,
	FileTimelineItem,
	JournalTimelineItem,
	TimelineDay,
} from "@src/features/home/lib/timelineTypes";

/** A dotted gap segment is drawn when MORE than this many empty days are skipped. */
export const GAP_THRESHOLD_DAYS = 3;

export type TimelineSide = "left" | "right";

/** One visual row hanging off a day. Same-type automatic items are already collapsed. */
export type TimelineEntry =
	| {
			type: "journal";
			key: string;
			item: JournalTimelineItem;
			/** Which side of the line the card sits on, on wide screens only. */
			side: TimelineSide;
	  }
	| {
			type: "files";
			key: string;
			action: MarkdownAction;
			items: FileTimelineItem[];
	  }
	| {
			type: "expenses";
			key: string;
			items: ExpenseTimelineItem[];
			totals: ExpenseDayTotals;
	  };

export interface DayRow {
	type: "day";
	key: string;
	day: string;
	label: string;
	isToday: boolean;
	/** Number of underlying activities, before collapsing. */
	count: number;
	entries: TimelineEntry[];
}

export interface GapRow {
	type: "gap";
	key: string;
	skippedDays: number;
}

export type TimelineRow = DayRow | GapRow;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from b to a (a later than b is positive). Rounded for DST. */
export const daysBetween = (a: string, b: string): number =>
	Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / DAY_MS);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

/** "Today", "Yesterday", then "Tue, 27 Oct 2026" (fixed names: locale output varies by ICU version). */
export const formatDayLabel = (day: string, today: string): string => {
	const diff = daysBetween(today, day);
	if (diff === 0) return "Today";
	if (diff === 1) return "Yesterday";
	const date = parseISODate(day);
	return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const inr = (fractionDigits: number) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: 2,
	});
const inrWhole = inr(0);
const inrCents = inr(2);

/** ₹1,000 for whole amounts, ₹1,240.50 when there are paise. */
export const formatINR = (amount: number): string =>
	(Number.isInteger(amount) ? inrWhole : inrCents).format(amount);

const plural = (count: number, singular: string): string =>
	`${count} ${singular}${count === 1 ? "" : "s"}`;

/** "6 expenses · Spent ₹1,000 · Received ₹79"; zero parts are left out. */
export const describeExpenses = (totals: ExpenseDayTotals): string => {
	const parts = [plural(totals.count, "expense")];
	if (totals.debit > 0) parts.push(`Spent ${formatINR(totals.debit)}`);
	if (totals.credit > 0) parts.push(`Received ${formatINR(totals.credit)}`);
	return parts.join(" · ");
};

const ACTION_VERB: Record<MarkdownAction, string> = {
	created: "Created",
	edited: "Edited",
	renamed: "Renamed",
	deleted: "Deleted",
};

const noun = (items: FileTimelineItem[]): string => {
	const folders = items.filter((item) => item.entry.meta?.isFolder).length;
	if (folders === items.length) return "folder";
	return folders === 0 ? "file" : "item";
};

/** "Edited 4 files" for a group, "Edited Notes/Idea.md" for a single row. */
export const describeFiles = (
	action: MarkdownAction,
	items: FileTimelineItem[],
): string => {
	if (items.length > 1) {
		return `${ACTION_VERB[action]} ${plural(items.length, noun(items))}`;
	}
	const { entry } = items[0];
	if (action === "renamed" && entry.meta?.oldName) {
		return `Renamed ${entry.meta.oldName} → ${entry.name}`;
	}
	return `${ACTION_VERB[action]} ${entry.name}`;
};

/**
 * Collapses one day's items for display: journal notes stay individual cards,
 * file activity is grouped per action, expenses become one group. Rendering
 * time only; nothing here is stored.
 */
export const buildEntries = (
	day: TimelineDay,
	nextSide: () => TimelineSide,
): TimelineEntry[] => {
	const entries: TimelineEntry[] = [];
	const fileGroups = new Map<MarkdownAction, FileTimelineItem[]>();
	const expenses: ExpenseTimelineItem[] = [];

	for (const item of day.items) {
		if (item.kind === "journal") {
			entries.push({ type: "journal", key: item.id, item, side: nextSide() });
		} else if (item.kind === "file") {
			const group = fileGroups.get(item.entry.action);
			if (group) group.push(item);
			else fileGroups.set(item.entry.action, [item]);
		} else {
			expenses.push(item);
		}
	}

	for (const [action, items] of fileGroups) {
		entries.push({ type: "files", key: `${day.day}:files:${action}`, action, items });
	}
	if (expenses.length > 0) {
		entries.push({
			type: "expenses",
			key: `${day.day}:expenses`,
			items: expenses,
			totals: day.expenseTotals,
		});
	}
	return entries;
};

/**
 * Turns merged days (newest first) into the rows the page draws, adding a
 * dotted gap row wherever more than GAP_THRESHOLD_DAYS empty days were skipped.
 * Journal cards alternate sides down the whole feed.
 */
export const buildTimelineRows = (
	days: TimelineDay[],
	today: string,
): TimelineRow[] => {
	const rows: TimelineRow[] = [];
	let side: TimelineSide = "right";
	const nextSide = (): TimelineSide => {
		const current = side;
		side = side === "right" ? "left" : "right";
		return current;
	};

	let previous: string | null = null;
	for (const day of days) {
		if (previous) {
			const skipped = daysBetween(previous, day.day) - 1;
			if (skipped > GAP_THRESHOLD_DAYS) {
				rows.push({ type: "gap", key: `gap:${previous}`, skippedDays: skipped });
			}
		}
		rows.push({
			type: "day",
			key: day.day,
			day: day.day,
			label: formatDayLabel(day.day, today),
			isToday: day.day === today,
			count: day.items.length,
			entries: buildEntries(day, nextSide),
		});
		previous = day.day;
	}
	return rows;
};

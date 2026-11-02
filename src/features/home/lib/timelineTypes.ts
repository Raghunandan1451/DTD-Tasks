import type { ExpenseEntry } from "@src/features/finance/type";
import type { JournalEntry, MarkdownLogEntry } from "@src/lib/db/types";

/** Inclusive range of local calendar days, YYYY-MM-DD. */
export interface TimelineRange {
	fromDay: string;
	toDay: string;
}

export type TimelineFilter = "all" | "journal" | "expenses" | "files";

export interface JournalTimelineItem {
	kind: "journal";
	id: string;
	entry: JournalEntry;
}

export interface ExpenseTimelineItem {
	kind: "expense";
	id: string;
	entry: ExpenseEntry;
}

export interface FileTimelineItem {
	kind: "file";
	id: string;
	entry: MarkdownLogEntry;
	/** False once the file is gone: the row stays readable but is not a link. */
	isLive: boolean;
}

export type TimelineItem =
	| JournalTimelineItem
	| ExpenseTimelineItem
	| FileTimelineItem;

export interface ExpenseDayTotals {
	count: number;
	debit: number;
	credit: number;
}

export interface TimelineDay {
	/** Local calendar day, YYYY-MM-DD. */
	day: string;
	items: TimelineItem[];
	expenseTotals: ExpenseDayTotals;
}

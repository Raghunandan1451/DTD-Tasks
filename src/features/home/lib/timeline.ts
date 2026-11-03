import store, { type RootState } from "@src/lib/store/store";
import { getJournalInRange, getJournalTimeBefore } from "@src/lib/db/journalRepo";
import {
	getMarkdownLogDayBefore,
	getMarkdownLogInRange,
} from "@src/lib/db/markdownLogRepo";
import type { JournalEntry, MarkdownLogEntry } from "@src/lib/db/types";
import {
	expenseDaysInRange,
	selectExpenseDays,
	type ExpenseDay,
} from "@src/lib/store/selectors/timelineExpenseSelectors";
import { collectItemIds } from "@src/lib/utils/markdownIds";
import { parseISODate, toLocalDay } from "@src/lib/utils/isoDate";
import type {
	ExpenseDayTotals,
	TimelineDay,
	TimelineFilter,
	TimelineItem,
	TimelineRange,
} from "@src/features/home/lib/timelineTypes";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NO_EXPENSES: ExpenseDayTotals = { count: 0, debit: 0, credit: 0 };

export interface TimelineSources {
	journal: JournalEntry[];
	expenseDays: ExpenseDay[];
	markdownLog: MarkdownLogEntry[];
	/**
	 * Ids of files/folders that still exist. Null means the file tree has not
	 * been loaded yet, so nothing can be called deleted: every row counts as live.
	 */
	liveFileIds: ReadonlySet<string> | null;
}

const isValidRange = ({ fromDay, toDay }: TimelineRange): boolean =>
	DAY_PATTERN.test(fromDay) && DAY_PATTERN.test(toDay) && fromDay <= toDay;

/** [start of fromDay, start of the day after toDay) in local epoch ms. */
const rangeToMs = ({ fromDay, toDay }: TimelineRange): [number, number] => {
	const end = parseISODate(toDay);
	end.setDate(end.getDate() + 1);
	return [parseISODate(fromDay).getTime(), end.getTime()];
};

const includes = (filter: TimelineFilter, kind: Exclude<TimelineFilter, "all">) =>
	filter === "all" || filter === kind;

/**
 * Merges the three sources into day groups, newest day first. Pure: no I/O.
 * Inside a day the order is fixed (journal notes, then file activity, then
 * expenses) because expenses carry a date but no time. Days with nothing in
 * them are never produced, and items outside the range are dropped.
 */
export const mergeTimelineDays = (
	range: TimelineRange,
	filter: TimelineFilter,
	sources: TimelineSources,
): TimelineDay[] => {
	if (!isValidRange(range)) return [];
	const inRange = (day: string) => day >= range.fromDay && day <= range.toDay;
	const days = new Map<string, TimelineDay>();

	const dayOf = (day: string): TimelineDay => {
		let entry = days.get(day);
		if (!entry) {
			entry = { day, items: [], expenseTotals: NO_EXPENSES };
			days.set(day, entry);
		}
		return entry;
	};

	if (includes(filter, "journal")) {
		const notes = [...sources.journal].sort((a, b) => b.createdAt - a.createdAt);
		for (const entry of notes) {
			const day = toLocalDay(entry.createdAt);
			if (!inRange(day)) continue;
			dayOf(day).items.push({ kind: "journal", id: `journal:${entry.id}`, entry });
		}
	}

	if (includes(filter, "files")) {
		const rows = [...sources.markdownLog].sort((a, b) => b.updatedAt - a.updatedAt);
		for (const entry of rows) {
			if (!inRange(entry.day)) continue;
			dayOf(entry.day).items.push({
				kind: "file",
				id: `file:${entry.id}`,
				entry,
				isLive: sources.liveFileIds ? sources.liveFileIds.has(entry.fileId) : true,
			});
		}
	}

	if (includes(filter, "expenses")) {
		for (const expenseDay of expenseDaysInRange(sources.expenseDays, range)) {
			const target = dayOf(expenseDay.day);
			target.expenseTotals = expenseDay.totals;
			for (const entry of expenseDay.items) {
				target.items.push({ kind: "expense", id: `expense:${entry.id}`, entry });
			}
		}
	}

	const kindOrder: Record<TimelineItem["kind"], number> = {
		journal: 0,
		file: 1,
		expense: 2,
	};
	return Array.from(days.values())
		.map((day) => ({
			...day,
			// Array.sort is stable, so the within-kind order above is kept.
			items: day.items.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]),
		}))
		.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
};

/**
 * The single entry point the UI uses: loads journal and markdown log from
 * IndexedDB, takes expenses and the live file tree from the store, and merges
 * them. Only the sources the filter needs are read. Callers should make sure
 * the expenses and file manager slices are hydrated first.
 */
export const getTimelineDays = async (
	range: TimelineRange,
	filter: TimelineFilter = "all",
	getState: () => RootState = store.getState,
): Promise<TimelineDay[]> => {
	if (!isValidRange(range)) return [];
	const [fromMs, toMs] = rangeToMs(range);

	const [journal, markdownLog] = await Promise.all([
		includes(filter, "journal") ? getJournalInRange(fromMs, toMs) : [],
		includes(filter, "files")
			? getMarkdownLogInRange(range.fromDay, range.toDay)
			: [],
	]);

	const state = getState();
	const fileManager = state.fileManager;
	return mergeTimelineDays(range, filter, {
		journal,
		markdownLog,
		expenseDays: includes(filter, "expenses") ? selectExpenseDays(state) : [],
		liveFileIds: fileManager?.loaded ? collectItemIds(fileManager.files) : null,
	});
};

/**
 * The newest day older than beforeDay that has anything to show for this
 * filter, or null when nothing older exists. Powers "Load more": it tells the
 * UI whether more history exists and how far back the next page must reach.
 */
export const getOlderDay = async (
	beforeDay: string,
	filter: TimelineFilter = "all",
	getState: () => RootState = store.getState,
): Promise<string | null> => {
	if (!DAY_PATTERN.test(beforeDay)) return null;
	const candidates: string[] = [];

	if (includes(filter, "journal")) {
		const time = await getJournalTimeBefore(parseISODate(beforeDay).getTime());
		if (time !== null) candidates.push(toLocalDay(time));
	}
	if (includes(filter, "files")) {
		const day = await getMarkdownLogDayBefore(beforeDay);
		if (day) candidates.push(day);
	}
	if (includes(filter, "expenses")) {
		// Newest first, so the first day before the cut-off is the answer.
		const older = selectExpenseDays(getState()).find((entry) => entry.day < beforeDay);
		if (older) candidates.push(older.day);
	}

	return candidates.reduce<string | null>(
		(newest, day) => (newest === null || day > newest ? day : newest),
		null,
	);
};

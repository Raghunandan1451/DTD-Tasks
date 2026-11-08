import { addMonths, format, parse } from "date-fns";
import type { RecurringItem } from "@src/features/finance/type";

/** Most entries one run will add for one item, so a typo in the start month can't flood the list. */
const MAX_POSTINGS_PER_ITEM = 120;

export interface RecurringPosting {
	itemId: string;
	/** "yyyy-MM-dd" */
	date: string;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const isValidMonth = (value: string): boolean => MONTH_PATTERN.test(value);

const monthStart = (month: string): Date => parse(`${month}-01`, "yyyy-MM-dd", new Date());

/** The date a payment falls on in a month: the chosen day, clamped to the month's end. */
const dueDateInMonth = (month: string, dayOfMonth: number): string => {
	const first = monthStart(month);
	const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
	const day = Math.min(Math.max(1, Math.floor(dayOfMonth)), last);
	return `${month}-${String(day).padStart(2, "0")}`;
};

const monthAt = (item: RecurringItem, k: number): string =>
	format(addMonths(monthStart(item.startMonth), k * Math.floor(item.everyMonths)), "yyyy-MM");

const isRunnable = (item: RecurringItem): boolean =>
	isValidMonth(item.startMonth) && item.everyMonths >= 1;

const pastEnd = (item: RecurringItem, month: string): boolean =>
	Boolean(item.endMonth && isValidMonth(item.endMonth) && month > item.endMonth);

/** Every due date of an item up to `until` (inclusive), within its start..end months. */
export const dueDates = (item: RecurringItem, until: string): string[] => {
	if (!isRunnable(item)) return [];
	const dates: string[] = [];
	for (let k = 0; k < 1200; k++) {
		const month = monthAt(item, k);
		if (pastEnd(item, month)) break;
		const date = dueDateInMonth(month, item.dayOfMonth);
		if (date > until) break;
		dates.push(date);
	}
	return dates;
};

/**
 * The entries that should be added now: each unpaused item's due dates after
 * its lastPosted, up to today. Pure, so the schedule can be tested without a store.
 */
export const planRecurringPostings = (
	items: readonly RecurringItem[],
	today: string,
): RecurringPosting[] => {
	const postings: RecurringPosting[] = [];
	for (const item of items) {
		if (item.paused) continue;
		const pending = dueDates(item, today).filter(
			(date) => !item.lastPosted || date > item.lastPosted,
		);
		// Keep the most recent ones if the backlog is huge.
		for (const date of pending.slice(-MAX_POSTINGS_PER_ITEM)) {
			postings.push({ itemId: item.id, date });
		}
	}
	return postings;
};

/** The next date after `after` an item falls due, or null if it has ended. Paused items still show one. */
export const nextDueDate = (item: RecurringItem, after: string): string | null => {
	if (!isRunnable(item)) return null;
	for (let k = 0; k < 1200; k++) {
		const month = monthAt(item, k);
		if (pastEnd(item, month)) return null;
		const date = dueDateInMonth(month, item.dayOfMonth);
		if (date > after) return date;
	}
	return null;
};

/** What the item costs per month on average (a yearly 12,000 is 1,000 a month). */
export const monthlyEquivalent = (item: RecurringItem): number =>
	item.paused ? 0 : item.amount / Math.max(1, Math.floor(item.everyMonths));

export const describeSchedule = (item: RecurringItem): string => {
	const every =
		item.everyMonths === 1
			? "Every month"
			: item.everyMonths === 12
				? "Every year"
				: `Every ${item.everyMonths} months`;
	const range = item.endMonth ? `${item.startMonth} → ${item.endMonth}` : `from ${item.startMonth}`;
	return `${every} on day ${item.dayOfMonth} · ${range}`;
};

/**
 * Money a recurring item will add up to in a calendar year that hasn't been
 * posted yet (due dates after `today`). Used by the yearly budget projection.
 */
export const unpostedAmountInYear = (item: RecurringItem, year: number, today: string): number => {
	if (item.paused || !isRunnable(item)) return 0;
	const yearEnd = `${year}-12-31`;
	const yearStart = `${year}-01-01`;
	return dueDates(item, yearEnd)
		.filter((date) => date >= yearStart && date > today)
		.reduce((sum) => sum + item.amount, 0);
};

/** What the add/edit form holds, as typed (strings), before it is checked. */
export interface RecurringDraft {
	name: string;
	group: string;
	amount: string;
	everyMonths: string;
	dayOfMonth: string;
	startMonth: string;
	endMonth: string;
}

export type RecurringDraftResult =
	{ ok: true; value: Omit<RecurringItem, "id" | "lastPosted"> } | { ok: false; message: string };

const MAX_EVERY_MONTHS = 120;

/** Checks the form and turns it into an item, or says what to fix. */
export const validateRecurringDraft = (draft: RecurringDraft): RecurringDraftResult => {
	const name = draft.name.trim();
	if (!name) return { ok: false, message: "Give the payment a name." };
	if (!draft.group) return { ok: false, message: "Choose a group." };
	const amount = Number(draft.amount);
	if (!(amount > 0) || !Number.isFinite(amount)) {
		return { ok: false, message: "Amount must be greater than 0." };
	}
	const everyMonths = Number(draft.everyMonths);
	if (!Number.isInteger(everyMonths) || everyMonths < 1 || everyMonths > MAX_EVERY_MONTHS) {
		return {
			ok: false,
			message: `Repeat must be a whole number from 1 to ${MAX_EVERY_MONTHS} months.`,
		};
	}
	const dayOfMonth = Number(draft.dayOfMonth);
	if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
		return { ok: false, message: "Day of month must be between 1 and 31." };
	}
	if (!isValidMonth(draft.startMonth)) return { ok: false, message: "Enter the start month as YYYY-MM." };
	if (draft.endMonth) {
		if (!isValidMonth(draft.endMonth)) return { ok: false, message: "End month is not valid." };
		if (draft.endMonth < draft.startMonth) {
			return { ok: false, message: "End month can't be before the start month." };
		}
	}
	return {
		ok: true,
		value: {
			name,
			group: draft.group,
			amount,
			everyMonths,
			dayOfMonth,
			startMonth: draft.startMonth,
			...(draft.endMonth ? { endMonth: draft.endMonth } : {}),
		},
	};
};

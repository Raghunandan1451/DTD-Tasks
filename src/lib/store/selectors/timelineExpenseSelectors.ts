import { createSelector } from "@reduxjs/toolkit";
import type { ExpenseEntry } from "@src/features/finance/type";
import type {
	ExpenseDayTotals,
	TimelineRange,
} from "@src/features/home/lib/timelineTypes";
import {
	selectDailyTotalsByDate,
	selectExpenses,
} from "@src/lib/store/selectors/expenseSelectors";

export interface ExpenseDay {
	/** The expense's own date, a local calendar day (YYYY-MM-DD). */
	day: string;
	items: ExpenseEntry[];
	totals: ExpenseDayTotals;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const EMPTY_TOTALS = { debit: 0, credit: 0 };

/**
 * Expenses grouped under their own date, newest day first. Reads only
 * `expenses.expenses` (never salary, budgets or recurring config).
 *
 * Dates are already local calendar days, so they are grouped and sorted as
 * strings, never through Date/toISOString. Debit/credit totals come from
 * `selectDailyTotalsByDate`, the same selector the Expenses page date picker
 * uses, so the two can never disagree. `amount` is the line total, so quantity
 * is not multiplied in.
 *
 * Memoized: the grouping reruns only when the expense array (or its totals)
 * changes, not on every render or unrelated store update.
 */
export const selectExpenseDays = createSelector(
	[selectExpenses, selectDailyTotalsByDate],
	(expenses, dailyTotals): ExpenseDay[] => {
		const byDay = new Map<string, ExpenseEntry[]>();
		for (const expense of expenses) {
			if (typeof expense.date !== "string" || !DAY_PATTERN.test(expense.date)) {
				continue;
			}
			const items = byDay.get(expense.date);
			if (items) items.push(expense);
			else byDay.set(expense.date, [expense]);
		}

		return Array.from(byDay, ([day, items]) => {
			const { debit, credit } = dailyTotals[day] ?? EMPTY_TOTALS;
			return { day, items, totals: { count: items.length, debit, credit } };
		}).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
	},
);

/** Days inside an inclusive day range, by string comparison. Input must be newest first. */
export const expenseDaysInRange = (
	days: ExpenseDay[],
	range: TimelineRange,
): ExpenseDay[] =>
	days.filter((entry) => entry.day >= range.fromDay && entry.day <= range.toDay);

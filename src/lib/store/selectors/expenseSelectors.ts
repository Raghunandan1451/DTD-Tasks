import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";
import { isSelectableGroup } from "@src/features/finance/lib/groupFilters";
import { ExpenseEntry } from "@src/features/finance/type";

export const selectExpenses = (state: RootState) => state.expenses.expenses;
export const selectSelectedDate = (state: RootState) =>
	state.expenses.selectedDate;
export const selectExpensesLoaded = (state: RootState) =>
	state.expenses.loaded;
const selectInitialBalance = (state: RootState) => state.finance.currentBalance;

/** Sums credits ("Cr") or debits (anything that isn't "Cr"). */
const sumByType = (expenses: ExpenseEntry[], type: "Dr" | "Cr"): number =>
	expenses
		.filter((expense) => (expense.type === "Cr") === (type === "Cr"))
		.reduce((total, expense) => total + expense.amount, 0);

export const selectExpensesForSelectedDate = createSelector(
	[selectExpenses, selectSelectedDate],
	(expenses, selectedDate) =>
		expenses.filter((expense) => expense.date === selectedDate),
);

export const selectSelectedDateTotal = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) => sumByType(expenses, "Dr"),
);

export const selectSelectedDateCredits = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) => sumByType(expenses, "Cr"),
);

const selectTotalAllCredits = createSelector([selectExpenses], (expenses) =>
	sumByType(expenses, "Cr"),
);

export const selectTotalAllExpenses = createSelector(
	[selectExpenses],
	(expenses) => sumByType(expenses, "Dr"),
);

export const selectCalculatedBalance = createSelector(
	[selectInitialBalance, selectTotalAllCredits, selectTotalAllExpenses],
	(initialBalance, totalCredits, totalExpenses) =>
		initialBalance + totalCredits - totalExpenses,
);

export interface DailyTotals {
	debit: number;
	credit: number;
}

/** Debit/credit totals keyed by ISO date, across all expenses (for the date picker). */
export const selectDailyTotalsByDate = createSelector(
	[selectExpenses],
	(expenses) => {
		const totals: Record<string, DailyTotals> = {};
		for (const expense of expenses) {
			const day = (totals[expense.date] ??= { debit: 0, credit: 0 });
			if (expense.type === "Cr") day.credit += expense.amount;
			else day.debit += expense.amount;
		}
		return totals;
	},
);

export const selectFilteredExpensesForSelectedDate = createSelector(
	[
		selectExpensesForSelectedDate,
		(_: RootState, groupFilter: string | null) => groupFilter,
	],
	(expenses, groupFilter) => {
		if (!groupFilter || groupFilter === "All") return expenses;
		return expenses.filter((expense) => expense.group === groupFilter);
	},
);

/**
 * Distinct, non-"Salary" group names actually present in expenses,
 * for building filter dropdowns. Guards against non-string or blank
 * `group` values (e.g. from an unvalidated JSON import, or an
 * orphaned reference left behind after a group was deleted via
 * GroupManager's removeGroup) so a filter dropdown never renders a
 * blank/undefined option.
 */
export const selectExpenseGroups = createSelector(
	[selectExpenses],
	(expenses) => {
		const groups = new Set(
			expenses.map((expense) => expense.group).filter(isSelectableGroup),
		);
		return Array.from(groups).sort();
	},
);

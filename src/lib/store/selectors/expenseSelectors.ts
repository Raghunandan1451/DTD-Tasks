import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";

const selectExpenses = (state: RootState) => state.expenses.expenses;
const selectSelectedDate = (state: RootState) => state.expenses.selectedDate;
const selectInitialBalance = (state: RootState) => state.finance.currentBalance;

export const selectExpensesForSelectedDate = createSelector(
	[selectExpenses, selectSelectedDate],
	(expenses, selectedDate) =>
		expenses.filter((expense) => expense.date === selectedDate),
);

export const selectSelectedDateTotal = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) =>
		expenses
			.filter((expense) => expense.type !== "Cr") // Exclude credits
			.reduce((total, expense) => total + expense.amount, 0),
);

export const selectSelectedDateCredits = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) =>
		expenses
			.filter((expense) => expense.type === "Cr")
			.reduce((total, expense) => total + expense.amount, 0),
);

export const selectTotalAllCredits = createSelector(
	[selectExpenses],
	(expenses) =>
		expenses
			.filter((expense) => expense.type === "Cr")
			.reduce((total, expense) => total + expense.amount, 0),
);

export const selectTotalAllExpenses = createSelector(
	[selectExpenses],
	(expenses) =>
		expenses
			.filter((expense) => expense.type !== "Cr")
			.reduce((total, expense) => total + expense.amount, 0),
);

export const selectCalculatedBalance = createSelector(
	[selectInitialBalance, selectTotalAllCredits, selectTotalAllExpenses],
	(initialBalance, totalCredits, totalExpenses) =>
		initialBalance + totalCredits - totalExpenses,
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
			expenses
				.map((expense) => expense.group)
				.filter(
					(group): group is string =>
						typeof group === "string" &&
						group.trim().length > 0 &&
						group !== "Salary",
				),
		);
		return Array.from(groups).sort();
	},
);

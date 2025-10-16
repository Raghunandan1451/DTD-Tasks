import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";

const selectExpenses = (state: RootState) => state.expenses.expenses;
const selectSelectedDate = (state: RootState) => state.expenses.selectedDate;
const selectInitialBalance = (state: RootState) => state.finance.currentBalance;

export const selectExpensesForSelectedDate = createSelector(
	[selectExpenses, selectSelectedDate],
	(expenses, selectedDate) =>
		expenses.filter((expense) => expense.date === selectedDate)
);

export const selectSelectedDateTotal = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) =>
		expenses
			.filter((expense) => expense.type !== "Cr") // Exclude credits
			.reduce((total, expense) => total + expense.amount, 0)
);

export const selectSelectedDateCredits = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) =>
		expenses
			.filter((expense) => expense.type === "Cr")
			.reduce((total, expense) => total + expense.amount, 0)
);

export const selectTotalAllCredits = createSelector(
	[selectExpenses],
	(expenses) =>
		expenses
			.filter((expense) => expense.type === "Cr")
			.reduce((total, expense) => total + expense.amount, 0)
);

export const selectTotalAllExpenses = createSelector(
	[selectExpenses],
	(expenses) =>
		expenses
			.filter((expense) => expense.type !== "Cr")
			.reduce((total, expense) => total + expense.amount, 0)
);

export const selectCalculatedBalance = createSelector(
	[selectInitialBalance, selectTotalAllCredits, selectTotalAllExpenses],
	(initialBalance, totalCredits, totalExpenses) =>
		initialBalance + totalCredits - totalExpenses
);

export const selectFilteredExpensesForSelectedDate = createSelector(
	[
		selectExpensesForSelectedDate,
		(_: RootState, groupFilter: string | null) => groupFilter,
	],
	(expenses, groupFilter) => {
		if (!groupFilter || groupFilter === "All") return expenses;
		return expenses.filter((expense) => expense.group === groupFilter);
	}
);

export const selectExpenseGroups = createSelector(
	[selectExpenses],
	(expenses) => {
		const groups = new Set(
			expenses
				.filter((expense) => expense.group !== "Salary") // Exclude Salary group from filters
				.map((expense) => expense.group)
		);
		return Array.from(groups).sort();
	}
);

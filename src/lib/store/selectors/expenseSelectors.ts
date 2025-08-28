// src/lib/store/selectors/expenseSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { ExpenseEntry } from "@src/lib/types/finance";

// Base selectors
const selectExpenses = (state: RootState) => state.expenses.expenses;
const selectSelectedDate = (state: RootState) => state.expenses.selectedDate;

// Get expenses for currently selected date
export const selectExpensesForSelectedDate = createSelector(
	[selectExpenses, selectSelectedDate],
	(expenses, selectedDate) =>
		expenses.filter((expense) => expense.date === selectedDate)
);

// Get total for selected date
export const selectSelectedDateTotal = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) => expenses.reduce((total, expense) => total + expense.amount, 0)
);

// Get expenses grouped by date
export const selectExpensesByDate = createSelector(
	[selectExpenses],
	(expenses) => {
		return expenses.reduce((acc, expense) => {
			if (!acc[expense.date]) acc[expense.date] = [];
			acc[expense.date].push(expense);
			return acc;
		}, {} as Record<string, ExpenseEntry[]>);
	}
);

// Get expenses for selected date filtered by group
export const selectFilteredExpensesForSelectedDate = (
	groupFilter: string | null
) =>
	createSelector([selectExpensesForSelectedDate], (expenses) => {
		if (!groupFilter || groupFilter === "All") return expenses;
		return expenses.filter((expense) => expense.group === groupFilter);
	});

// Get unique groups from all expenses
export const selectExpenseGroups = createSelector(
	[selectExpenses],
	(expenses) => {
		const groups = new Set(expenses.map((expense) => expense.group));
		return Array.from(groups).sort();
	}
);
export const selectTotalExpenses = createSelector(
	[selectExpenses],
	(expenses) => expenses.reduce((total, expense) => total + expense.amount, 0)
);
export const selectExpensesForDateRange = (
	startDate: string,
	endDate: string
) =>
	createSelector([selectExpenses], (expenses) =>
		expenses.filter(
			(expense) => expense.date >= startDate && expense.date <= endDate
		)
	);

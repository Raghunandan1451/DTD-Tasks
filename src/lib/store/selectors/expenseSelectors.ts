// src/lib/store/selectors/expenseSelectors.ts - Fixed balance calculations
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";
import { ExpenseEntry } from "@src/lib/types/finance";

// Base selectors
const selectExpenses = (state: RootState) => state.expenses.expenses;
const selectSelectedDate = (state: RootState) => state.expenses.selectedDate;
const selectInitialBalance = (state: RootState) => state.finance.currentBalance;

// Get expenses for currently selected date
export const selectExpensesForSelectedDate = createSelector(
	[selectExpenses, selectSelectedDate],
	(expenses, selectedDate) =>
		expenses.filter((expense) => expense.date === selectedDate)
);

// Get total expenses for selected date (only debits, exclude salary)
export const selectSelectedDateTotal = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) =>
		expenses
			.filter((expense) => expense.type !== "Cr") // Exclude credits
			.reduce((total, expense) => total + expense.amount, 0)
);

// Get total credits for selected date (salary/income)
export const selectSelectedDateCredits = createSelector(
	[selectExpensesForSelectedDate],
	(expenses) =>
		expenses
			.filter((expense) => expense.type === "Cr")
			.reduce((total, expense) => total + expense.amount, 0)
);

// ===== ALL-TIME CALCULATIONS (for the 3 summary fields) =====

// Total all-time credits (salaries + other income)
export const selectTotalAllCredits = createSelector(
	[selectExpenses],
	(expenses) =>
		expenses
			.filter((expense) => expense.type === "Cr")
			.reduce((total, expense) => total + expense.amount, 0)
);

// Total all-time expenses/debits
export const selectTotalAllExpenses = createSelector(
	[selectExpenses],
	(expenses) =>
		expenses
			.filter((expense) => expense.type !== "Cr")
			.reduce((total, expense) => total + expense.amount, 0)
);

// MAIN BALANCE CALCULATION: Initial Balance + All Credits - All Expenses
export const selectCalculatedBalance = createSelector(
	[selectInitialBalance, selectTotalAllCredits, selectTotalAllExpenses],
	(initialBalance, totalCredits, totalExpenses) =>
		initialBalance + totalCredits - totalExpenses
);

// REMAINING BALANCE (same as calculated balance for all-time view)
export const selectRemainingBalance = createSelector(
	[selectCalculatedBalance],
	(calculatedBalance) => calculatedBalance
);

// ===== DAILY CALCULATIONS =====

// Net for selected date (credits - expenses for that day)
export const selectSelectedDateNet = createSelector(
	[selectSelectedDateCredits, selectSelectedDateTotal],
	(credits, expenses) => credits - expenses
);

// ===== UTILITY SELECTORS =====

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

// Get expenses for selected date filtered by group (excluding salary entries from filter)
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
// Get unique groups from expenses (excluding salary group from filters)
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

// Get expenses for date range
export const selectExpensesForDateRange = (
	startDate: string,
	endDate: string
) =>
	createSelector([selectExpenses], (expenses) =>
		expenses.filter(
			(expense) => expense.date >= startDate && expense.date <= endDate
		)
	);

// ===== MONTHLY/WEEKLY AGGREGATIONS =====

// Get monthly summary (useful for graphs)
export const selectMonthlyExpenseSummary = createSelector(
	[selectExpenses],
	(expenses) => {
		const monthlyData: Record<
			string,
			{ credits: number; debits: number; net: number }
		> = {};

		expenses.forEach((expense) => {
			const monthKey = expense.date.substring(0, 7); // YYYY-MM
			if (!monthlyData[monthKey]) {
				monthlyData[monthKey] = { credits: 0, debits: 0, net: 0 };
			}

			if (expense.type === "Cr") {
				monthlyData[monthKey].credits += expense.amount;
			} else {
				monthlyData[monthKey].debits += expense.amount;
			}
			monthlyData[monthKey].net =
				monthlyData[monthKey].credits - monthlyData[monthKey].debits;
		});

		return monthlyData;
	}
);

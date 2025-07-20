// src/lib/store/selectors/expenseSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@src/lib/store/store";
import { getDailyEquivalent } from "@src/lib/utils/expense";
import { Expense } from "@src/lib/types/expense";

export const selectExpenses = (state: RootState) => state.expenses.expenses;

export const selectTotalDailyExpense = createSelector(
	[selectExpenses],
	(expenses) =>
		expenses.reduce((total, expense) => {
			if (!expense.divideToDaily) return total;
			return (
				total +
				getDailyEquivalent(
					expense.amount,
					expense.unit,
					expense.startDate
				)
			);
		}, 0)
);

export const selectTotalMonthlyExpense = createSelector(
	[selectExpenses],
	(expenses) =>
		expenses.reduce((total, expense) => {
			const daily = getDailyEquivalent(
				expense.amount,
				expense.unit,
				expense.startDate
			);
			return total + daily * 30; // Approximate monthly
		}, 0)
);

export const selectMostExpensive = createSelector(
	[selectExpenses],
	(expenses) => {
		type ExpenseWithDaily = Expense & { daily: number };

		return expenses.reduce<ExpenseWithDaily>(
			(max, expense) => {
				const daily = getDailyEquivalent(
					expense.amount,
					expense.unit,
					expense.startDate
				);
				return daily > max.daily ? { ...expense, daily } : max;
			},
			{
				id: "",
				name: "",
				amount: 0,
				unit: "daily",
				startDate: "",
				daily: 0,
			}
		);
	}
);

export const selectExpensesByCategory = createSelector(
	[selectExpenses],
	(expenses) => {
		const grouped: Record<string, Expense[]> = {};
		expenses.forEach((exp) => {
			const category = exp.category || "uncategorized";
			if (!grouped[category]) grouped[category] = [];
			grouped[category].push(exp);
		});
		return grouped;
	}
);

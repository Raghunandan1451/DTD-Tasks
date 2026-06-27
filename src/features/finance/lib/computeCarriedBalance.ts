import type { ExpenseEntry, Expense } from "@src/features/finance/type";

type TrendableExpense = Pick<Expense | ExpenseEntry, "date" | "amount" | "type">;

/**
 * Running balance carried forward from before a scoped date range
 * (e.g. a single month's report). Not yet wired into anything --
 * intended for a future PDF-export refactor that scopes
 * buildBalanceTrend to one month while still showing the correct
 * starting balance.
 */
export const computeCarriedBalance = (
	expenses: TrendableExpense[],
	initialBalance: number,
	beforeDateKey: string
): number => {
	return expenses
		.filter((expense) => expense.date < beforeDateKey)
		.reduce((balance, expense) => {
			const amount =
				typeof expense.amount === "number" && !Number.isNaN(expense.amount)
					? expense.amount
					: 0;
			return balance + (expense.type === "Cr" ? amount : -amount);
		}, initialBalance);
};

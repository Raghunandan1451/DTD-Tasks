import { format } from "date-fns";
import {
	BudgetCategory,
	BudgetExpense,
	ExpenseEntry,
} from "@src/features/finance/type";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";

export const AUTO_SAVINGS_PREFIX = "auto-savings-";

/** Identifies whether a category is the protected Savings category */
export const isSavingsCategory = (category: BudgetCategory): boolean =>
	category.id === "savings" || category.name.trim().toLowerCase() === "savings";

/** Auto-calculated savings entries are read-only */
export const isAutoSavingsEntry = (budgetExpense: BudgetExpense): boolean =>
	budgetExpense.id.startsWith(AUTO_SAVINGS_PREFIX);

export const formatAmount = (amount: number): string =>
	amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

export const clampPercentage = (value: number): number =>
	Math.min(100, Math.max(0, value));

export const getDefaultCategories = (
	legacyCategories: BudgetCategory[] | undefined,
	month: string,
): BudgetCategory[] =>
	month === format(new Date(), "yyyy-MM")
		? (legacyCategories ?? DEFAULT_BUDGET_CATEGORIES)
		: DEFAULT_BUDGET_CATEGORIES;

export const createBudgetCategory = (): BudgetCategory => ({
	id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	name: "",
	percentage: 0,
	expenses: [],
});

/** Debit expenses for a month, excluding credits and salary */
export const getMonthlyDebitExpenses = (
	expenses: ExpenseEntry[],
	month: string,
): ExpenseEntry[] =>
	expenses.filter(
		(expense) =>
			expense.date.startsWith(month) &&
			expense.type !== "Cr" &&
			expense.group !== "Salary",
	);

/** Ledger expense ids already linked to any category in the plan */
export const getAssignedExpenseIds = (
	categories: BudgetCategory[],
): Set<string> =>
	new Set(
		categories.flatMap((category) =>
			(category.expenses ?? [])
				.map((expense) => expense.expenseId)
				.filter((id): id is string => Boolean(id)),
		),
	);

/** Uses the live ledger name and amount when linked, otherwise the stored snapshot */
export const resolveBudgetExpense = (
	budgetExpense: BudgetExpense,
	monthlyExpenses: ExpenseEntry[],
): { name: string; amount: number } => {
	const ledgerExpense =
		budgetExpense.expenseId === undefined
			? undefined
			: monthlyExpenses.find((e) => e.id === budgetExpense.expenseId);
	return {
		name: ledgerExpense?.name ?? budgetExpense.name,
		amount: ledgerExpense?.amount ?? budgetExpense.amount,
	};
};

export const getTotalCategoryExpenses = (
	categoryExpenses: BudgetExpense[],
	monthlyExpenses: ExpenseEntry[],
): number =>
	categoryExpenses.reduce(
		(sum, budgetExpense) =>
			sum + resolveBudgetExpense(budgetExpense, monthlyExpenses).amount,
		0,
	);

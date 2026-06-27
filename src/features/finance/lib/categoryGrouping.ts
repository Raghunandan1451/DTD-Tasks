import type { ExpenseEntry, Expense } from "@src/features/finance/type";

export interface CategoryAmount {
	group: string;
	amount: number;
}

const FALLBACK_GROUP_LABEL = "Uncategorized";

/**
 * Coerces a possibly-malformed `group` value into a safe, non-empty string.
 * Expense data can enter the app from JSON import, older schema versions,
 * or manual entry — none of which are guaranteed at runtime even though
 * the type system says `group: string`. This is the single place that
 * normalizes that risk so every chart doesn't need its own guard.
 */
export const normalizeGroupLabel = (value: unknown): string => {
	if (typeof value === "string" && value.trim().length > 0) {
		return value;
	}
	return FALLBACK_GROUP_LABEL;
};

/**
 * Groups debit ("Dr") expenses by category and sums their amounts.
 * Shared by ExpensesByCategoryBar and the PDF category chart so the
 * PDF category chart so the three never drift out of sync again.
 */
export const groupExpensesByCategory = (
	expenses: Array<Expense | ExpenseEntry>,
): CategoryAmount[] => {
	const grouped = expenses
		.filter((expense) => expense.type !== "Cr")
		.reduce<Record<string, number>>((acc, expense) => {
			const label = normalizeGroupLabel(expense.group);
			const amount =
				typeof expense.amount === "number" &&
				!Number.isNaN(expense.amount)
					? expense.amount
					: 0;
			acc[label] = (acc[label] || 0) + amount;
			return acc;
		}, {});

	return Object.entries(grouped)
		.map(([group, amount]) => ({ group, amount }))
		.sort((a, b) => b.amount - a.amount);
};

export interface CategoryAmountWithPercentage extends CategoryAmount {
	percentage: number;
}

/**
 * Adds each category's share of the total as a percentage (0-100).
 * Kept separate from groupExpensesByCategory so consumers that don't
 * need percentages (e.g. the PDF report) aren't affected.
 */
export const withPercentages = (
	categories: CategoryAmount[],
): CategoryAmountWithPercentage[] => {
	const total = categories.reduce((sum, c) => sum + c.amount, 0);

	return categories.map((category) => ({
		...category,
		percentage: total > 0 ? (category.amount / total) * 100 : 0,
	}));
};

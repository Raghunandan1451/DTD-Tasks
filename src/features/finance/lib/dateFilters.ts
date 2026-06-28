import type { DateFilter, Expense, ExpenseEntry } from "@src/features/finance/type";

/**
 * Filters expenses to those falling within the given relative date window.
 * Extracted from ExpensesByCategoryBar's inline switch so it can be
 * unit-tested and reused anywhere else a "today/weekly/monthly/yearly"
 * quick-filter is needed.
 */
export const filterExpensesByDateRange = <T extends Pick<Expense | ExpenseEntry, "date">>(
	expenses: T[],
	filter: DateFilter
): T[] => {
	const now = new Date();

	return expenses.filter((expense) => {
		const expenseDate = new Date(expense.date);

		switch (filter) {
			case "today":
				return expenseDate.toDateString() === now.toDateString();

			case "yesterday": {
				const yesterday = new Date(now);
				yesterday.setDate(now.getDate() - 1);
				return expenseDate.toDateString() === yesterday.toDateString();
			}

			case "weekly": {
				const weekAgo = new Date(now);
				weekAgo.setDate(now.getDate() - 7);
				return expenseDate >= weekAgo;
			}

			case "monthly": {
				const monthAgo = new Date(now);
				monthAgo.setMonth(now.getMonth() - 1);
				return expenseDate >= monthAgo;
			}

			case "yearly": {
				const yearAgo = new Date(now);
				yearAgo.setFullYear(now.getFullYear() - 1);
				return expenseDate >= yearAgo;
			}

			default:
				return true;
		}
	});
};

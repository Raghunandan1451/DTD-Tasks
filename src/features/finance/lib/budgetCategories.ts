import { BudgetCategory } from "@src/features/finance/type";

export const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
	{ id: "needs", name: "Needs", percentage: 50 },
	{ id: "wants", name: "Wants", percentage: 30 },
	{ id: "savings", name: "Savings", percentage: 20 },
];

import {
	BudgetCategory,
	ExpenseEntry,
	RecurringItem,
	SalaryHistoryEntry,
} from "@src/features/finance/type";

export interface CategoryDraft {
	category: BudgetCategory;
	isNew: boolean;
}

export interface BudgetPlannerProps {
	monthlyIncome: number;
	salaryHistory?: SalaryHistoryEntry[];
	legacyCategories?: BudgetCategory[];
	plansByMonth?: Record<string, BudgetCategory[]>;
	onPlanChange: (month: string, categories: BudgetCategory[]) => void;
	expenses: ExpenseEntry[];
	/** Recurring payments, so the yearly view can include ones not yet posted */
	recurring?: RecurringItem[];
}

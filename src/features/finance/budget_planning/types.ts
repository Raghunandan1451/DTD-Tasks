import {
	BudgetCategory,
	ExpenseEntry,
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
}

// src/components/expenses/ExpenseSections.tsx
import { FC, lazy } from "react";
import {
	ExpenseEntry,
	BudgetCategory,
	SalaryHistoryEntry,
	ViewMode,
} from "@src/features/finance/type";
import { Suspense } from "react";
import { Loader } from "lucide-react";

import SalaryForm from "@src/features/finance/base_setup/FinanceSetup";
import { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
const ExpenseList = lazy(
	() => import("@src/features/finance/expense_list/ExpenseList")
);
const ExpenseGraphs = lazy(
	() => import("@src/features/finance/expense_graph/ExpenseGraphs")
);
const BudgetPlanner = lazy(
	() => import("@src/features/finance/budget_planning/BudgetPlanner")
);

export const ExpenseSections: FC<{
	viewMode: ViewMode;
	allExpenses: ExpenseEntry[];
	budgetCategories: BudgetCategory[];
	budgetPlansByMonth?: Record<string, BudgetCategory[]>;
	onBudgetPlanChange: (
		month: string,
		categories: BudgetCategory[],
	) => void;
	currentBalance?: number;
	monthlyIncome?: number;
	salaryHistory?: SalaryHistoryEntry[];
	showNotification?: ShowNotificationFn;
}> = ({
	viewMode,
	allExpenses = [],
	budgetCategories,
	budgetPlansByMonth,
	onBudgetPlanChange,
	currentBalance,
	monthlyIncome = 0,
	salaryHistory,
	showNotification,
}) => {
	return (
		<div className="flex-1 overflow-auto glassmorphic-bg p-4 scrollbar-hide">
			{viewMode === "list" && (
				<Suspense
					fallback={<Loader className="animate-spin text-gray-500" />}
				>
					<ExpenseList showNotification={showNotification} />
				</Suspense>
			)}

			{viewMode === "graph" && (
				<Suspense
					fallback={<Loader className="animate-spin text-gray-500" />}
				>
					<ExpenseGraphs
						expenses={allExpenses}
						initialBalance={currentBalance}
					/>
				</Suspense>
			)}

			{viewMode === "salary" && <SalaryForm />}

			{viewMode === "budget" && (
				<Suspense
					fallback={<Loader className="animate-spin text-gray-500" />}
				>
					<BudgetPlanner
						monthlyIncome={monthlyIncome}
						salaryHistory={salaryHistory}
						legacyCategories={budgetCategories}
						plansByMonth={budgetPlansByMonth}
						onPlanChange={onBudgetPlanChange}
						expenses={allExpenses}
					/>
				</Suspense>
			)}
		</div>
	);
};

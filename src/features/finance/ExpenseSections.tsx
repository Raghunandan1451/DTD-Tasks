// src/components/expenses/ExpenseSections.tsx
import { FC, lazy } from "react";
import {
	ExpenseEntry,
	BudgetCategory,
	RecurringItem,
	SalaryHistoryEntry,
	ViewMode,
} from "@src/features/finance/type";
import { Suspense } from "react";
import { Loader } from "lucide-react";

import FinanceOverview from "@src/features/finance/base_setup/FinanceOverview";
import { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
const ExpenseList = lazy(
	() => import("@src/features/finance/expense_list/ExpenseList")
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
	/** Balance right now, after all entries */
	balance?: number;
	monthlyIncome?: number;
	salaryHistory?: SalaryHistoryEntry[];
	recurring?: RecurringItem[];
	showNotification?: ShowNotificationFn;
}> = ({
	viewMode,
	allExpenses = [],
	budgetCategories,
	budgetPlansByMonth,
	onBudgetPlanChange,
	currentBalance,
	balance,
	monthlyIncome = 0,
	salaryHistory,
	recurring,
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

			{viewMode === "salary" && (
				<FinanceOverview
					expenses={allExpenses}
					salaryHistory={salaryHistory}
					monthlyIncome={monthlyIncome}
					startingBalance={currentBalance}
					balance={balance}
				/>
			)}

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
						recurring={recurring}
					/>
				</Suspense>
			)}
		</div>
	);
};

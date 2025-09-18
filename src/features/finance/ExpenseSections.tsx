// src/components/expenses/ExpenseSections.tsx
import { FC, lazy } from "react";
import {
	ExpenseEntry,
	SimulatedExpense,
	ViewMode,
} from "@src/features/finance/type";
import { Suspense } from "react";
import { Loader } from "lucide-react";

import SalaryForm from "@src/features/finance/base_setup/FinanceSetup";
const ExpenseList = lazy(
	() => import("@src/features/finance/expense_list/ExpenseList")
);
const ExpenseGraphs = lazy(
	() => import("@src/features/finance/expense_graph/ExpenseGraphs")
);
const Estimator = lazy(
	() => import("@src/features/finance/estimate_expense/BudgetSimulator")
);

export const ExpenseSections: FC<{
	viewMode: ViewMode;
	allExpenses: ExpenseEntry[];
	datedExpenses: ExpenseEntry[];
	simulatedExpenses: SimulatedExpense[];
	setSimulatedExpenses: React.Dispatch<
		React.SetStateAction<SimulatedExpense[]>
	>;
	currentBalance?: number;
}> = ({
	viewMode,
	allExpenses = [],
	datedExpenses = [],
	simulatedExpenses,
	setSimulatedExpenses,
	currentBalance,
}) => {
	return (
		<div className="flex-1 overflow-auto glassmorphic-bg p-4 scrollbar-hide">
			{viewMode === "list" && (
				<Suspense
					fallback={<Loader className="animate-spin text-gray-500" />}
				>
					<ExpenseList expenses={datedExpenses as ExpenseEntry[]} />
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

			{viewMode === "estimate" && (
				<Suspense
					fallback={<Loader className="animate-spin text-gray-500" />}
				>
					<Estimator
						setSimulatedExpenses={setSimulatedExpenses}
						simulatedExpenses={simulatedExpenses}
					/>
				</Suspense>
			)}
		</div>
	);
};

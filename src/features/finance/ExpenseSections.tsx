// src/components/expenses/ExpenseSections.tsx
import { FC, lazy } from "react";
import {
	ExpenseEntry,
	SimulatedExpense,
	ViewMode,
} from "@src/lib/types/finance";
import { Suspense } from "react";
import { Loader } from "lucide-react";

import SalaryForm from "@src/features/finance/base_setup/FinanceSetup";
const ExpenseList = lazy(
	() => import("@src/features/finance/expense_list/ExpenseList")
);
const GraphComponent = lazy(
	() => import("@src/features/finance/expense_section/GraphComponent")
);
const Estimator = lazy(
	() => import("@src/features/finance/estimate_expense/BudgetSimulator")
);

export const ExpenseSections: FC<{
	viewMode: ViewMode;
	allExpenses: ExpenseEntry[];
	simulatedExpenses: SimulatedExpense[];
	setSimulatedExpenses: React.Dispatch<
		React.SetStateAction<SimulatedExpense[]>
	>;
}> = ({
	viewMode,
	allExpenses = [],
	simulatedExpenses,
	setSimulatedExpenses,
}) => {
	return (
		<div className="flex-1 overflow-auto glassmorphic-bg p-4">
			{viewMode === "list" && (
				<Suspense
					fallback={<Loader className="animate-spin text-gray-500" />}
				>
					<ExpenseList expenses={allExpenses as ExpenseEntry[]} />
				</Suspense>
			)}

			{viewMode === "graph" && (
				<Suspense
					fallback={<Loader className="animate-spin text-gray-500" />}
				>
					<GraphComponent />
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

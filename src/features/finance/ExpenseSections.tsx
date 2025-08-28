// src/components/expenses/ExpenseSections.tsx
import { FC, lazy } from "react";
import { ExpenseEntry, ViewMode } from "@src/lib/types/finance";
import { Suspense } from "react";
import { Loader } from "lucide-react";

import SalaryForm from "@src/features/finance/base_setup/FinanceSetup";
const ExpenseList = lazy(
	() => import("@src/features/finance/expense_list/ExpenseList")
);
const GraphComponent = lazy(
	() => import("@src/features/finance/expense_section/GraphComponent")
);
const Simulator = lazy(
	() => import("@src/features/finance/expense_section/Simulator")
);

export const ExpenseSections: FC<{
	viewMode: ViewMode;
	allExpenses: ExpenseEntry[];
}> = ({ viewMode, allExpenses = [] }) => {
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
					<Simulator />
				</Suspense>
			)}
		</div>
	);
};

// src/components/expenses/ExpenseSections.tsx
import { FC } from "react";
import { Expense, ViewMode } from "@src/lib/types/expense";

import ExpenseList from "@src/features/expense_tracker/expense_section/ExpenseList";
// import { GraphComponent } from "./GraphComponent";
// import { SalaryForm } from "./SalaryForm";
// import { SimulationTool } from "./SimulationTool";

interface ExpenseSectionsProps {
	viewMode: ViewMode;
	allExpenses: Expense[];
}

export const ExpenseSections: FC<ExpenseSectionsProps> = ({
	viewMode,
	allExpenses,
}) => {
	return (
		<div className="mt-6">
			{viewMode === "list" && <ExpenseList expenses={allExpenses} />}
			{/* {viewMode === "graph" && <GraphComponent />} */}
			{/* {viewMode === "salary" && <SalaryForm />} */}
			{/* {viewMode === "simulation" && <SimulationTool />} */}
		</div>
	);
};

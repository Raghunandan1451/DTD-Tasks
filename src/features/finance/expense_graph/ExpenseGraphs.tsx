import React from "react";
import BalanceTrendChart from "@src/features/finance/expense_graph/BalanceTrendChart";
import ExpensesByCategoryBar from "@src/features/finance/expense_graph/ExpensesByCategoryBar";
import ExpensesByCategoryPie from "@src/features/finance/expense_graph/ExpensesByCategoryPie";
import { Expense } from "@src/features/finance/type";

interface Props {
	expenses: Expense[];
	initialBalance?: number;
}

const ExpenseGraphs: React.FC<Props> = ({
	expenses,
	initialBalance = 3000,
}) => {
	if (expenses.length === 0 && !initialBalance)
		return (
			<div className="text-center text-gray-700 dark:text-gray-300">
				No expenses to display.
			</div>
		);
	return (
		<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
			<BalanceTrendChart
				expenses={expenses}
				initialBalance={initialBalance}
			/>
			<ExpensesByCategoryBar expenses={expenses} />
			<ExpensesByCategoryPie expenses={expenses} />
		</div>
	);
};

export default ExpenseGraphs;

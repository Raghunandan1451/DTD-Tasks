import React from "react";
import BalanceTrendChart from "@src/features/finance/expense_graph/BalanceTrendChart";
import ExpensesByCategoryBar from "@src/features/finance/expense_graph/ExpensesByCategoryBar";
import { Expense } from "@src/features/finance/type";

interface Props {
	expenses: Expense[];
	initialBalance?: number;
}

const ExpenseGraphs: React.FC<Props> = ({
	expenses,
	initialBalance = 3000,
}) => {
	if (expenses.length === 0 && !initialBalance) {
		return (
			<div className="text-center text-gray-700 dark:text-gray-300">
				No expenses to display.
			</div>
		);
	}

	return (
		// Side by side once there's enough width for both charts to stay
		// readable (each has its own horizontal scroll/brush content);
		// stacks on narrower screens instead of squeezing both into half-width.
		<div className="grid gap-6 pb-4 xl:grid-cols-2 xl:items-start">
			<BalanceTrendChart
				expenses={expenses}
				initialBalance={initialBalance}
			/>
			<ExpensesByCategoryBar expenses={expenses} />
		</div>
	);
};

export default ExpenseGraphs;

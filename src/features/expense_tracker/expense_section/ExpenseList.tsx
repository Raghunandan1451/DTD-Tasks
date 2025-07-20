import { Expense } from "@src/lib/types/expense";
import { FC } from "react";

const ExpenseList: FC<{ expenses: Expense[] }> = ({ expenses }) => {
	return (
		<div className="mt-4">
			<h3 className="text-lg font-semibold">Your Expenses</h3>
			<ul className="list-disc list-inside">
				{expenses.map((expense) => (
					<li key={expense.id}>
						{expense.name}: ${expense.amount}
					</li>
				))}
			</ul>
		</div>
	);
};

export default ExpenseList;

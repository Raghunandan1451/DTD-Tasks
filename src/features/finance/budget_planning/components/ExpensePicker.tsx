import { FC } from "react";
import Button from "@src/components/ui/button/Button";
import { ExpenseEntry } from "@src/features/finance/type";
import { formatAmount } from "@src/features/finance/budget_planning/lib/budgetPlanUtils";

interface ExpensePickerProps {
	monthName: string;
	expenses: ExpenseEntry[];
	onAdd: (expense: ExpenseEntry) => void;
	onClose: () => void;
}

const ExpensePicker: FC<ExpensePickerProps> = ({
	monthName,
	expenses,
	onAdd,
	onClose,
}) => (
	<div className="space-y-2 rounded-lg border border-gray-200 p-2 dark:border-gray-600">
		<div className="flex items-center justify-between gap-2">
			<p className="text-sm font-medium">Expenses in {monthName}</p>
			<Button
				type="button"
				onClick={onClose}
				aria-label="Close expense list"
				className="rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
			>
				Close
			</Button>
		</div>
		{expenses.length === 0 ? (
			<p className="text-sm text-gray-500 dark:text-gray-400">
				No unassigned expenses in this month.
			</p>
		) : (
			<ul className="max-h-48 space-y-1 overflow-y-auto">
				{expenses.map((expense) => (
					<li key={expense.id}>
						<Button
							type="button"
							onClick={() => onAdd(expense)}
							className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<span className="truncate">{expense.name}</span>
							<span className="shrink-0">{formatAmount(expense.amount)}</span>
						</Button>
					</li>
				))}
			</ul>
		)}
	</div>
);

export default ExpensePicker;

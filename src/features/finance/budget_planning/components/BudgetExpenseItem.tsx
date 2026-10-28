import { FC } from "react";
import { Trash2 } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { BudgetExpense, ExpenseEntry } from "@src/features/finance/type";
import {
	formatAmount,
	isAutoSavingsEntry,
	resolveBudgetExpense,
} from "@src/features/finance/budget_planning/lib/budgetPlanUtils";

interface BudgetExpenseItemProps {
	budgetExpense: BudgetExpense;
	monthlyExpenses: ExpenseEntry[];
	onRemove: () => void;
}

const BudgetExpenseItem: FC<BudgetExpenseItemProps> = ({
	budgetExpense,
	monthlyExpenses,
	onRemove,
}) => {
	const { name, amount } = resolveBudgetExpense(budgetExpense, monthlyExpenses);

	return (
		<div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-600 dark:bg-gray-800">
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">
					{name || "Expense"}
					{budgetExpense.isEstimated && (
						<span
							className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-500 dark:bg-gray-700 dark:text-gray-300"
							title="Calculated from your current salary; no salary credit was recorded for this month"
						>
							estimated
						</span>
					)}
				</p>
				<p
					className={`text-sm ${
						amount < 0
							? "text-red-600 dark:text-red-400"
							: "text-gray-600 dark:text-gray-300"
					}`}
				>
					{formatAmount(amount)}
				</p>
			</div>
			{!isAutoSavingsEntry(budgetExpense) && (
				<Button
					type="button"
					onClick={onRemove}
					aria-label={`Remove ${name || "expense"}`}
					title="Remove expense"
					className="rounded-md p-2 text-gray-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
};

export default BudgetExpenseItem;

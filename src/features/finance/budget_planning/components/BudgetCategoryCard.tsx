import { FC } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { BudgetCategory, ExpenseEntry } from "@src/features/finance/type";
import {
	formatAmount,
	getTotalCategoryExpenses,
	isSavingsCategory,
} from "@src/features/finance/budget_planning/lib/budgetPlanUtils";
import BudgetExpenseItem from "@src/features/finance/budget_planning/components/BudgetExpenseItem";
import ExpensePicker from "@src/features/finance/budget_planning/components/ExpensePicker";

interface BudgetCategoryCardProps {
	category: BudgetCategory;
	monthName: string;
	monthlyIncome: number;
	monthlyExpenses: ExpenseEntry[];
	availableExpenses: ExpenseEntry[];
	isPickerOpen: boolean;
	onPickerOpenChange: (open: boolean) => void;
	onEdit: () => void;
	onRemove: () => void;
	onAddExpense: (expense: ExpenseEntry) => void;
	onRemoveExpense: (expenseId: string) => void;
}

const BudgetCategoryCard: FC<BudgetCategoryCardProps> = ({
	category,
	monthName,
	monthlyIncome,
	monthlyExpenses,
	availableExpenses,
	isPickerOpen,
	onPickerOpenChange,
	onEdit,
	onRemove,
	onAddExpense,
	onRemoveExpense,
}) => {
	const isDisabled = category.percentage === 0;
	const isSavings = isSavingsCategory(category);
	const allocatedAmount = (monthlyIncome * category.percentage) / 100;
	const categoryExpenses = category.expenses ?? [];
	const totalCategoryExpenses = getTotalCategoryExpenses(
		categoryExpenses,
		monthlyExpenses,
	);

	// Savings: green when ≥ allocation (red when below)
	// Needs/Wants: green when within allocation (red when exceeded)
	const isOverBudget = isSavings
		? totalCategoryExpenses < allocatedAmount
		: totalCategoryExpenses > allocatedAmount;
	const expenseColorClass =
		categoryExpenses.length === 0
			? ""
			: isOverBudget
				? "text-red-600 dark:text-red-400"
				: "text-green-600 dark:text-green-400";

	return (
		<div
			className={`min-w-0 space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 ${
				isDisabled
					? "bg-gray-100/70 dark:bg-gray-900/30"
					: "bg-white/50 dark:bg-gray-800/20"
			}`}
		>
			<div className="flex min-w-0 items-center gap-2">
				<div className="min-w-0 flex-1">
					<p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
					<h3 className="truncate text-base font-semibold">
						{category.name || "Unnamed category"}
					</h3>
				</div>
				<div className="shrink-0 text-right">
					<p className="text-xs text-gray-500 dark:text-gray-400">Allocation</p>
					<p className="text-sm font-medium">{category.percentage}%</p>
				</div>
				<Button
					type="button"
					onClick={onEdit}
					aria-label={`Edit ${category.name || "category"}`}
					title="Edit category"
					className="rounded-md p-2 text-gray-500 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
				>
					<Pencil className="h-4 w-4" />
				</Button>
				{/* Delete is hidden for the Savings card */}
				{!isSavings && (
					<Button
						type="button"
						onClick={onRemove}
						aria-label={`Remove ${category.name || "category"}`}
						title="Remove category"
						className="rounded-md p-2 text-gray-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Allocated row + live expense total */}
			<div className="flex items-center justify-between border-t border-gray-200 pt-2 text-sm dark:border-gray-700">
				<span>
					<span className="text-gray-500 dark:text-gray-400">Allocated: </span>
					<span className="font-medium">{formatAmount(allocatedAmount)}</span>
				</span>
				{categoryExpenses.length > 0 && (
					<span>
						<span className="text-gray-500 dark:text-gray-400">Spent: </span>
						<span className={`font-semibold ${expenseColorClass}`}>
							{formatAmount(totalCategoryExpenses)}
						</span>
					</span>
				)}
			</div>

			<div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
				{categoryExpenses.map((budgetExpense) => (
					<BudgetExpenseItem
						key={budgetExpense.id}
						budgetExpense={budgetExpense}
						monthlyExpenses={monthlyExpenses}
						onRemove={() => onRemoveExpense(budgetExpense.id)}
					/>
				))}

				{/* Savings card: no manual expense picker */}
				{!isSavings &&
					(isPickerOpen ? (
						<ExpensePicker
							monthName={monthName}
							expenses={availableExpenses}
							onAdd={onAddExpense}
							onClose={() => onPickerOpenChange(false)}
						/>
					) : (
						<Button
							type="button"
							onClick={() => onPickerOpenChange(true)}
							disabled={isDisabled}
							className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							<Plus className="h-4 w-4" />
							Add expense
						</Button>
					))}
			</div>
		</div>
	);
};

export default BudgetCategoryCard;

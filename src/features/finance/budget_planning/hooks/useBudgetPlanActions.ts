import { useState } from "react";
import { BudgetCategory, ExpenseEntry } from "@src/features/finance/type";
import { useConfirmationModal } from "@src/lib/hooks/useConfirmDialog";
import { isSavingsCategory } from "@src/features/finance/budget_planning/lib/budgetPlanUtils";

interface UseBudgetPlanActionsParams {
	month: string;
	categories: BudgetCategory[];
	onPlanChange: (month: string, categories: BudgetCategory[]) => void;
}

/** Category removal, expense linking, and the expense picker state */
export const useBudgetPlanActions = ({
	month,
	categories,
	onPlanChange,
}: UseBudgetPlanActionsParams) => {
	const [activePickerCategoryId, setActivePickerCategoryId] = useState<
		string | null
	>(null);
	const confirmationModal = useConfirmationModal();

	const updateCategory = (id: string, updates: Partial<BudgetCategory>) => {
		onPlanChange(
			month,
			categories.map((category) =>
				category.id === id ? { ...category, ...updates } : category,
			),
		);
	};

	const removeCategory = async (category: BudgetCategory) => {
		// Savings card is protected — cannot be deleted
		if (isSavingsCategory(category)) return;

		const confirmed = await confirmationModal.confirm({
			title: "Delete Category",
			message:
				"Are you sure you want to delete this budget category? Expenses assigned to it will be removed from this budget plan.",
			itemName: category.name,
			confirmText: "Delete",
			cancelText: "Cancel",
			type: "danger",
		});
		if (!confirmed) return;

		onPlanChange(
			month,
			categories.filter((item) => item.id !== category.id),
		);
		if (activePickerCategoryId === category.id) setActivePickerCategoryId(null);
	};

	const addExpense = (category: BudgetCategory, entry: ExpenseEntry) => {
		updateCategory(category.id, {
			expenses: [
				...(category.expenses ?? []),
				{
					id: `budget-expense-${entry.id}`,
					expenseId: entry.id,
					name: entry.name,
					amount: entry.amount,
				},
			],
		});
		setActivePickerCategoryId(null);
	};

	const removeExpense = (category: BudgetCategory, expenseId: string) => {
		updateCategory(category.id, {
			expenses: (category.expenses ?? []).filter(
				(expense) => expense.id !== expenseId,
			),
		});
	};

	return {
		activePickerCategoryId,
		setActivePickerCategoryId,
		confirmationModal,
		removeCategory,
		addExpense,
		removeExpense,
	};
};

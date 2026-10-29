import { FC, useMemo, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { ConfirmationModal } from "@src/components/shared/dialog/ConfirmModal";
import { useCategoryDraft } from "@src/features/finance/budget_planning/hooks/useCategoryDraft";
import { useBudgetPlanActions } from "@src/features/finance/budget_planning/hooks/useBudgetPlanActions";
import {
	getAssignedExpenseIds,
	getDefaultCategories,
	getMonthlyDebitExpenses,
} from "@src/features/finance/budget_planning/lib/budgetPlanUtils";
import { BudgetPlannerProps } from "@src/features/finance/budget_planning/types";
import BudgetMonthHeader from "@src/features/finance/budget_planning/components/BudgetMonthHeader";
import BudgetCategoryCard from "@src/features/finance/budget_planning/components/BudgetCategoryCard";
import CategoryFormModal from "@src/features/finance/budget_planning/components/CategoryFormModal";
import PotentialSavingsSummary from "@src/features/finance/budget_planning/components/PotentialSavingsSummary";
import {
	calculatePotentialSavings,
	getSalaryForMonth,
	resolveMonthlyIncome,
} from "@src/features/finance/budget_planning/lib/savingsCalculations";

const BudgetPlanner: FC<BudgetPlannerProps> = ({
	monthlyIncome,
	salaryHistory,
	legacyCategories,
	plansByMonth = {},
	onPlanChange,
	expenses,
}) => {
	const [monthDate, setMonthDate] = useState(() => new Date());
	const month = format(monthDate, "yyyy-MM");
	const monthName = format(monthDate, "MMMM");
	const categories =
		plansByMonth[month] ?? getDefaultCategories(legacyCategories, month);

	const {
		categoryDraft,
		openAddCategory,
		openEditCategory,
		closeCategoryDraft,
		updateDraft,
		saveCategory,
	} = useCategoryDraft({ month, categories, onPlanChange });

	const {
		activePickerCategoryId,
		setActivePickerCategoryId,
		confirmationModal,
		removeCategory,
		addExpense,
		removeExpense,
	} = useBudgetPlanActions({ month, categories, onPlanChange });

	const monthlyExpenses = useMemo(
		() => getMonthlyDebitExpenses(expenses, month),
		[expenses, month],
	);
	const income = useMemo(
		() =>
			resolveMonthlyIncome(
				month,
				expenses,
				getSalaryForMonth(month, salaryHistory, monthlyIncome),
			),
		[month, expenses, monthlyIncome, salaryHistory],
	);
	const potentialSavings = useMemo(
		() =>
			calculatePotentialSavings({
				categories,
				income: income.amount,
				monthlyExpenses,
			}),
		[categories, income.amount, monthlyExpenses],
	);
	const assignedExpenseIds = getAssignedExpenseIds(categories);
	const availableExpenses = monthlyExpenses.filter(
		(expense) => !assignedExpenseIds.has(expense.id),
	);
	const totalPercentage = categories.reduce(
		(total, category) => total + category.percentage,
		0,
	);

	return (
		<section className="space-y-4" aria-label="Monthly income budget plan">
			<BudgetMonthHeader
				monthDate={monthDate}
				totalPercentage={totalPercentage}
				onPreviousMonth={() =>
					setMonthDate((date) => subMonths(date, 1))
				}
				onNextMonth={() => setMonthDate((date) => addMonths(date, 1))}
				onAddCategory={openAddCategory}
			/>

			<PotentialSavingsSummary
				monthName={monthName}
				savings={potentialSavings}
			/>

			<div
				className="grid items-start gap-3"
				aria-label={`${format(monthDate, "MMMM yyyy")} budget categories`}
				style={{
					gridTemplateColumns:
						"repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
				}}
			>
				{categories.map((category) => (
					<BudgetCategoryCard
						key={`${month}-${category.id}`}
						category={category}
						monthName={monthName}
						monthlyIncome={income.amount}
						monthlyExpenses={monthlyExpenses}
						availableExpenses={availableExpenses}
						isPickerOpen={activePickerCategoryId === category.id}
						onPickerOpenChange={(open) =>
							setActivePickerCategoryId(open ? category.id : null)
						}
						onEdit={() => openEditCategory(category)}
						onRemove={() => void removeCategory(category)}
						onAddExpense={(expense) =>
							addExpense(category, expense)
						}
						onRemoveExpense={(expenseId) =>
							removeExpense(category, expenseId)
						}
					/>
				))}
			</div>

			{categoryDraft && (
				<CategoryFormModal
					draft={categoryDraft}
					onChange={updateDraft}
					onSubmit={saveCategory}
					onClose={closeCategoryDraft}
				/>
			)}

			<ConfirmationModal
				isOpen={confirmationModal.isOpen}
				options={confirmationModal.options}
				onConfirm={confirmationModal.handleConfirm}
				onCancel={confirmationModal.handleCancel}
			/>
		</section>
	);
};

export default BudgetPlanner;

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
import YearlySummary from "@src/features/finance/budget_planning/components/YearlySummary";
import { buildYearlyTotals } from "@src/features/finance/budget_planning/lib/yearlyTotals";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
	recurring,
}) => {
	const [monthDate, setMonthDate] = useState(() => new Date());
	const [view, setView] = useState<"month" | "year">("month");
	const [year, setYear] = useState(() => new Date().getFullYear());
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
	const yearly = useMemo(
		() =>
			view === "year"
				? buildYearlyTotals({
						year,
						expenses,
						salaryHistory,
						currentSalary: monthlyIncome,
						plansByMonth,
						legacyCategories,
						recurring,
					})
				: null,
		[view, year, expenses, salaryHistory, monthlyIncome, plansByMonth, legacyCategories, recurring],
	);
	const totalPercentage = categories.reduce(
		(total, category) => total + category.percentage,
		0,
	);

	const viewSwitch = (
		<div className="flex items-center gap-1" role="group" aria-label="Budget view">
			{(["month", "year"] as const).map((option) => (
				<button
					key={option}
					type="button"
					aria-pressed={view === option}
					onClick={() => setView(option)}
					className={`rounded-md px-3 py-1.5 text-sm ${
						view === option ? "btn-glass-selected" : "btn-glass-unselected"
					}`}
				>
					{option === "month" ? "Month" : "Year"}
				</button>
			))}
		</div>
	);

	if (view === "year" && yearly) {
		return (
			<section className="space-y-4" aria-label="Yearly budget summary">
				<div className="flex flex-wrap items-center justify-between gap-3">
					{viewSwitch}
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setYear((value) => value - 1)}
							aria-label="Previous year"
							className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<h2 className="min-w-20 text-center font-semibold" aria-live="polite">
							{year}
						</h2>
						<button
							type="button"
							onClick={() => setYear((value) => value + 1)}
							aria-label="Next year"
							className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
				</div>
				<YearlySummary totals={yearly} />
			</section>
		);
	}

	return (
		<section className="space-y-4" aria-label="Monthly income budget plan">
			{viewSwitch}
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

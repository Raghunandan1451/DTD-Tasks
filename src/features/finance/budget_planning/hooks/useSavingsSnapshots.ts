import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { format } from "date-fns";
import { AppDispatch } from "@src/lib/store/store";
import { applyBudgetPlans } from "@src/lib/store/slices/financeSlice";
import { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import { reconcileSavingsSnapshots } from "@src/features/finance/budget_planning/lib/savingsCalculations";

interface UseSavingsSnapshotsParams {
	finance: FinanceState;
	expenses: ExpenseEntry[];
	expensesLoaded: boolean;
}

/**
 * Keeps every past month's auto-savings entry in sync with its income,
 * allocations and expenses. Waits for both slices to hydrate, and dispatches
 * a single batched update only when a snapshot actually changed, so repeated
 * runs (Strict Mode, re-renders, month rollover) are no-ops.
 */
export const useSavingsSnapshots = ({
	finance,
	expenses,
	expensesLoaded,
}: UseSavingsSnapshotsParams): void => {
	const dispatch = useDispatch<AppDispatch>();
	const { loaded, salary, salaryHistory, budgetCategories, budgetPlansByMonth } =
		finance;
	const salaryAmount = salary?.amount ?? 0;
	// Re-evaluates when the calendar month rolls over
	const currentMonth = format(new Date(), "yyyy-MM");

	useEffect(() => {
		if (!loaded || !expensesLoaded) return;

		const changes = reconcileSavingsSnapshots({
			plansByMonth: budgetPlansByMonth ?? {},
			legacyCategories: budgetCategories,
			expenses,
			fallbackSalary: salaryAmount,
			salaryHistory,
			today: new Date(),
		});
		if (Object.keys(changes).length > 0) {
			dispatch(applyBudgetPlans(changes));
		}
	}, [
		dispatch,
		loaded,
		expensesLoaded,
		expenses,
		salaryAmount,
		salaryHistory,
		budgetCategories,
		budgetPlansByMonth,
		currentMonth,
	]);
};

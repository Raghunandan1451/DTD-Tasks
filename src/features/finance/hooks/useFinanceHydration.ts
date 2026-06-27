import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@src/lib/store/store";
import { hydrateFinance } from "@src/lib/store/thunks/financeThunk";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import { addSalaryForMissedMonths } from "@src/lib/utils/finance";
import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";

/**
 * Loads finance + expense state on mount, then backfills any missed
 * salary credits once both are loaded. Extracted from ExpenseTracker's
 * three separate useEffects so the container only has to call one hook.
 */
export const useFinanceHydration = (
	finance: FinanceState,
	expenses: ExpenseEntry[],
	expensesLoaded: boolean
) => {
	const dispatch = useDispatch<AppDispatch>();
	const { loaded, salary } = finance;

	useEffect(() => {
		if (!loaded) dispatch(hydrateFinance());
		if (!expensesLoaded) dispatch(hydrateExpenses());
	}, [dispatch, loaded, expensesLoaded]);

	useEffect(() => {
		if (loaded && expensesLoaded && salary) {
			addSalaryForMissedMonths(salary, expenses, dispatch, finance, 6);
		}
	}, [loaded, expensesLoaded, salary, expenses, dispatch, finance]);
};

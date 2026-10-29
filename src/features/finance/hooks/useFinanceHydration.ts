import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@src/lib/store/store";
import {
	backfillMissedSalaries,
	hydrateFinance,
} from "@src/lib/store/thunks/financeThunk";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import {
	selectFinanceLoaded,
	selectSalary,
} from "@src/lib/store/selectors/financeSelectors";
import { selectExpensesLoaded } from "@src/lib/store/selectors/expenseSelectors";

/**
 * Loads finance + expense state on mount, then backfills any missed
 * salary credits once both are loaded. Backfill depends only on the load
 * flags and the salary, so editing expenses never re-triggers it.
 */
export const useFinanceHydration = () => {
	const dispatch = useDispatch<AppDispatch>();
	const loaded = useSelector(selectFinanceLoaded);
	const expensesLoaded = useSelector(selectExpensesLoaded);
	const salary = useSelector(selectSalary);

	useEffect(() => {
		if (!loaded) dispatch(hydrateFinance());
		if (!expensesLoaded) dispatch(hydrateExpenses());
	}, [dispatch, loaded, expensesLoaded]);

	useEffect(() => {
		if (loaded && expensesLoaded && salary) {
			dispatch(backfillMissedSalaries());
		}
	}, [dispatch, loaded, expensesLoaded, salary]);
};

import { createAsyncThunk } from "@reduxjs/toolkit";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import { FinanceState } from "@src/features/finance/type";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";
import { addSalaryForMissedMonths } from "@src/lib/utils/finance";
import type { AppDispatch, RootState } from "@src/lib/store/store";

export const hydrateFinance = createAsyncThunk(
	"finance/hydrate",
	async (_, { dispatch }) => {
		const data = await getFromIndexedDB<FinanceState>("redux_finance_data");
		if (data) dispatch(setFinanceState(data));
	}
);

/**
 * Adds salary credits for months that were missed. Reads the latest state
 * itself, so callers only trigger it (after both slices hydrate, or when the
 * salary changes) and never re-run it on ordinary expense edits.
 */
export const backfillMissedSalaries = createAsyncThunk(
	"finance/backfillMissedSalaries",
	async (_, { dispatch, getState }) => {
		const { finance, expenses } = getState() as RootState;
		if (!finance.loaded || !expenses.loaded || !finance.salary) return 0;

		return addSalaryForMissedMonths(
			finance.salary,
			expenses.expenses,
			dispatch as AppDispatch,
			finance.lastUpdatedDate,
			6,
		);
	}
);

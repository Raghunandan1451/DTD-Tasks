import { createAsyncThunk } from "@reduxjs/toolkit";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import { FinanceState } from "@src/features/finance/type";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";
import { addRecurringForMissedMonths, addSalaryForMissedMonths } from "@src/lib/utils/finance";
import { todayISO } from "@src/lib/utils/isoDate";
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

/** Adds entries for recurring payments that have fallen due. Safe to re-run: it never adds a date twice. */
export const postRecurringExpenses = createAsyncThunk(
	"finance/postRecurringExpenses",
	async (_, { dispatch, getState }) => {
		const { finance, expenses } = getState() as RootState;
		if (!finance.loaded || !expenses.loaded || !finance.recurring?.length) return 0;

		return addRecurringForMissedMonths(
			finance.recurring,
			expenses.expenses,
			dispatch as AppDispatch,
			todayISO(),
		);
	}
);

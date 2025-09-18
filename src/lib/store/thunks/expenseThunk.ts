// src/lib/store/thunks/expenseThunk.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import { ExpenseEntry } from "@src/features/finance/type";
import { setExpenses } from "@src/lib/store/slices/expensesSlice";
import { RootState } from "@src/lib/store/store";

// This should match what your middleware saves (entire slice state)
interface ExpensesPersistedState {
	expenses: ExpenseEntry[];
	selectedDate: string;
	loaded: boolean;
}

export const hydrateExpenses = createAsyncThunk(
	"expenses/hydrate",
	async (_, { dispatch, getState }) => {
		try {
			const state = getState() as RootState;

			// Prevent loading if already loaded
			if (state.expenses.loaded) return;

			const data = await getFromIndexedDB<ExpensesPersistedState>(
				"redux_expenses_data"
			);

			if (data && Array.isArray(data.expenses)) {
				dispatch(setExpenses(data.expenses));
			} else {
				// No data found, mark as loaded anyway
				dispatch(setExpenses([]));
			}
		} catch (error) {
			console.error("Failed to hydrate expenses:", error);
			dispatch(setExpenses([]));
		}
	}
);

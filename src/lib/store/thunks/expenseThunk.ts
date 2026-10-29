// src/lib/store/thunks/expenseThunk.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import {
	ExpensesState,
	setExpenses,
} from "@src/lib/store/slices/expensesSlice";
import { RootState } from "@src/lib/store/store";

export const hydrateExpenses = createAsyncThunk(
	"expenses/hydrate",
	async (_, { dispatch, getState }) => {
		try {
			const state = getState() as RootState;

			if (state.expenses.loaded) return;

			const data = await getFromIndexedDB<ExpensesState>(
				"redux_expenses_data",
			);

			if (data && Array.isArray(data.expenses)) {
				dispatch(setExpenses(data.expenses));
			} else {
				dispatch(setExpenses([]));
			}
		} catch (error) {
			console.error("Failed to hydrate expenses:", error);
			dispatch(setExpenses([]));
		}
	},
);

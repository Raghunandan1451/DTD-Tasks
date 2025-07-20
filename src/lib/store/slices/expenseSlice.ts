import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Expense } from "@src/lib/types/expense";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";

export interface ExpenseState {
	expenses: Expense[];
	loaded: boolean;
}

const initialState: ExpenseState = {
	expenses: [],
	loaded: false,
};

export const hydrateExpenses = createAsyncThunk(
	"expenses/hydrate",
	async (_, { dispatch }) => {
		const data = await getFromIndexedDB<ExpenseState>(
			"redux_expenses_data"
		);
		if (data) dispatch(setExpenseState(data));
	}
);

const expenseSlice = createSlice({
	name: "expenses",
	initialState,
	reducers: {
		addExpense: (state, action: PayloadAction<Expense>) => {
			state.expenses.push(action.payload);
		},
		removeExpense: (state, action: PayloadAction<string>) => {
			state.expenses = state.expenses.filter(
				(e) => e.id !== action.payload
			);
		},
		setExpenseState: (_, action: PayloadAction<ExpenseState>) => ({
			...action.payload,
			loaded: true,
		}),
	},
});

export const { addExpense, removeExpense, setExpenseState } =
	expenseSlice.actions;
export default expenseSlice.reducer;

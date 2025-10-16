// src/store/slices/expensesSlice.ts - Minimal changes to existing code
import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import { ExpenseEntry } from "@src/features/finance/type";

interface ExpensesState {
	expenses: ExpenseEntry[];
	selectedDate: string;
	loaded: boolean;
}

const initialState: ExpensesState = {
	expenses: [],
	selectedDate: new Date().toISOString().split("T")[0],
	loaded: false,
};

const expensesSlice = createSlice({
	name: "expenses",
	initialState,
	reducers: {
		setExpenses(state, action: PayloadAction<ExpenseEntry[]>) {
			state.expenses = action.payload;
			state.loaded = true;
		},

		setSelectedDate(state, action: PayloadAction<string>) {
			state.selectedDate = action.payload;
		},

		goToPreviousDay(state) {
			const currentDate = new Date(state.selectedDate);
			currentDate.setDate(currentDate.getDate() - 1);
			state.selectedDate = currentDate.toISOString().split("T")[0];
		},

		goToNextDay(state) {
			const currentDate = new Date(state.selectedDate);
			currentDate.setDate(currentDate.getDate() + 1);
			state.selectedDate = currentDate.toISOString().split("T")[0];
		},

		goToToday(state) {
			state.selectedDate = new Date().toISOString().split("T")[0];
		},

		addExpense(state, action: PayloadAction<Omit<ExpenseEntry, "id">>) {
			state.expenses.push({
				...action.payload,
				id: nanoid(),
				// Set default type based on whether it's salary or regular expense
				type:
					action.payload.type ||
					(action.payload.group === "Salary" ? "Cr" : "Dr"),
			});
		},

		addExpenseToSelectedDate(
			state,
			action: PayloadAction<Omit<ExpenseEntry, "id" | "date">>
		) {
			state.expenses.push({
				...action.payload,
				id: nanoid(),
				date: state.selectedDate,
				type: "Dr",
			});
		},

		updateExpense(state, action: PayloadAction<ExpenseEntry>) {
			const index = state.expenses.findIndex(
				(e) => e.id === action.payload.id
			);
			if (index >= 0) {
				state.expenses[index] = action.payload;
			}
		},

		deleteExpense(state, action: PayloadAction<string>) {
			state.expenses = state.expenses.filter(
				(e) => e.id !== action.payload
			);
		},
	},
});

export const {
	setExpenses,
	setSelectedDate,
	goToPreviousDay,
	goToNextDay,
	goToToday,
	addExpense,
	addExpenseToSelectedDate,
	updateExpense,
	deleteExpense,
} = expensesSlice.actions;

export default expensesSlice.reducer;

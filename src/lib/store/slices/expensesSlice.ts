// src/store/slices/expensesSlice.ts - Minimal changes to existing code
import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import { ExpenseEntry } from "@src/features/finance/type";

interface ExpensesState {
	expenses: ExpenseEntry[];
	selectedDate: string; // Currently viewed date (YYYY-MM-DD)
	loaded: boolean;
}

const initialState: ExpensesState = {
	expenses: [],
	selectedDate: new Date().toISOString().split("T")[0], // Today's date
	loaded: false,
};

const expensesSlice = createSlice({
	name: "expenses",
	initialState,
	reducers: {
		// Load expenses from external source (API, localStorage, etc.)
		setExpenses(state, action: PayloadAction<ExpenseEntry[]>) {
			state.expenses = action.payload;
			state.loaded = true;
		},

		// Set the currently selected/viewed date
		setSelectedDate(state, action: PayloadAction<string>) {
			state.selectedDate = action.payload;
		},

		// Navigate to previous day
		goToPreviousDay(state) {
			const currentDate = new Date(state.selectedDate);
			currentDate.setDate(currentDate.getDate() - 1);
			state.selectedDate = currentDate.toISOString().split("T")[0];
		},

		// Navigate to next day
		goToNextDay(state) {
			const currentDate = new Date(state.selectedDate);
			currentDate.setDate(currentDate.getDate() + 1);
			state.selectedDate = currentDate.toISOString().split("T")[0];
		},

		// Go to today's date
		goToToday(state) {
			state.selectedDate = new Date().toISOString().split("T")[0];
		},

		// Add expense with explicit date
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

		// Add expense to currently selected date (unchanged - user entries default to Dr)
		addExpenseToSelectedDate(
			state,
			action: PayloadAction<Omit<ExpenseEntry, "id" | "date">>
		) {
			state.expenses.push({
				...action.payload,
				id: nanoid(),
				date: state.selectedDate,
				type: "Dr", // User entries are always expenses (Dr)
			});
		},

		// Update existing expense
		updateExpense(state, action: PayloadAction<ExpenseEntry>) {
			const index = state.expenses.findIndex(
				(e) => e.id === action.payload.id
			);
			if (index >= 0) {
				state.expenses[index] = action.payload;
			}
		},

		// Update expense with partial data
		updateExpensePartial(
			state,
			action: PayloadAction<{
				id: string;
				updates: Partial<Omit<ExpenseEntry, "id">>;
			}>
		) {
			const index = state.expenses.findIndex(
				(e) => e.id === action.payload.id
			);
			if (index >= 0) {
				Object.assign(state.expenses[index], action.payload.updates);
			}
		},

		// Delete expense by ID
		deleteExpense(state, action: PayloadAction<string>) {
			state.expenses = state.expenses.filter(
				(e) => e.id !== action.payload
			);
		},

		// Clear all expenses
		clearAllExpenses(state) {
			state.expenses = [];
		},

		// Clear expenses for selected date only
		clearExpensesForSelectedDate(state) {
			state.expenses = state.expenses.filter(
				(e) => e.date !== state.selectedDate
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
	updateExpensePartial,
	deleteExpense,
	clearAllExpenses,
	clearExpensesForSelectedDate,
} = expensesSlice.actions;

export default expensesSlice.reducer;

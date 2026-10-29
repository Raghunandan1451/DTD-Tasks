// src/store/slices/expensesSlice.ts
import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import { addDays, addMonths } from "date-fns";
import { ExpenseEntry } from "@src/features/finance/type";
import {
	formatISODate,
	parseISODate,
	todayISO,
} from "@src/lib/utils/isoDate";

export interface ExpensesState {
	expenses: ExpenseEntry[];
	selectedDate: string;
	loaded: boolean;
}

const initialState: ExpensesState = {
	expenses: [],
	selectedDate: todayISO(),
	loaded: false,
};

/** ISO dates sort lexicographically, so a string compare is enough. */
const clampToToday = (date: string): string => {
	const today = todayISO();
	return date > today ? today : date;
};

/** Salary entries default to credits, everything else to debits. */
const buildEntry = (
	payload: Omit<ExpenseEntry, "id">,
): ExpenseEntry => ({
	...payload,
	id: nanoid(),
	type: payload.type || (payload.group === "Salary" ? "Cr" : "Dr"),
});

const expensesSlice = createSlice({
	name: "expenses",
	initialState,
	reducers: {
		setExpenses(state, action: PayloadAction<ExpenseEntry[]>) {
			state.expenses = action.payload;
			state.loaded = true;
		},

		setSelectedDate(state, action: PayloadAction<string>) {
			state.selectedDate = clampToToday(action.payload);
		},

		/** Moves the selected date by days and/or months, never past today. */
		shiftSelectedDate(
			state,
			action: PayloadAction<{ days?: number; months?: number }>,
		) {
			const { days = 0, months = 0 } = action.payload;
			const shifted = addDays(
				addMonths(parseISODate(state.selectedDate), months),
				days,
			);
			state.selectedDate = clampToToday(formatISODate(shifted));
		},

		addExpense(state, action: PayloadAction<Omit<ExpenseEntry, "id">>) {
			state.expenses.push(buildEntry(action.payload));
		},

		addExpenseToSelectedDate(
			state,
			action: PayloadAction<Omit<ExpenseEntry, "id" | "date">>,
		) {
			state.expenses.push(
				buildEntry({ ...action.payload, date: state.selectedDate }),
			);
		},

		updateExpense(state, action: PayloadAction<ExpenseEntry>) {
			const index = state.expenses.findIndex(
				(e) => e.id === action.payload.id,
			);
			if (index >= 0) {
				state.expenses[index] = action.payload;
			}
		},

		deleteExpense(state, action: PayloadAction<string>) {
			state.expenses = state.expenses.filter(
				(e) => e.id !== action.payload,
			);
		},
	},
});

export const {
	setExpenses,
	setSelectedDate,
	shiftSelectedDate,
	addExpense,
	addExpenseToSelectedDate,
	updateExpense,
	deleteExpense,
} = expensesSlice.actions;

export default expensesSlice.reducer;

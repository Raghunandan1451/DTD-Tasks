// tests/store/expenseSlice.test.ts
import expenseReducer, {
	addExpense,
	removeExpense,
	setExpenseState,
	ExpenseState,
} from "@src/lib/store/slices/expenseSlice";
import { Expense } from "@src/lib/types/finance";
import { describe, it, expect } from "vitest";

describe("expenseSlice", () => {
	const mockExpense: Expense = {
		id: "1",
		name: "Netflix",
		amount: 500,
		unit: "monthly",
		startDate: "2025-01-01",
		divideToDaily: true,
	};

	const initialState: ExpenseState = {
		expenses: [],
		loaded: false,
	};

	it("should handle addExpense", () => {
		const nextState = expenseReducer(initialState, addExpense(mockExpense));
		expect(nextState.expenses).toHaveLength(1);
		expect(nextState.expenses[0]).toEqual(mockExpense);
	});

	it("should handle removeExpense", () => {
		const preloadedState = { ...initialState, expenses: [mockExpense] };
		const nextState = expenseReducer(preloadedState, removeExpense("1"));
		expect(nextState.expenses).toHaveLength(0);
	});

	it("should handle setExpenseState", () => {
		const newState: ExpenseState = {
			expenses: [mockExpense],
			loaded: false,
		};
		const nextState = expenseReducer(
			initialState,
			setExpenseState(newState)
		);
		expect(nextState.expenses).toHaveLength(1);
		expect(nextState.loaded).toBe(true);
	});
});

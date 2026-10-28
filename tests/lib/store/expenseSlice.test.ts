// tests/store/expenseSlice.test.ts
import expenseReducer, {
	addExpense,
	addExpenseToSelectedDate,
	deleteExpense,
	setExpenses,
	setSelectedDate,
	shiftSelectedDate,
} from "@src/lib/store/slices/expensesSlice";
import { ExpenseEntry } from "@src/features/finance/type";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type ExpensesState = ReturnType<typeof expenseReducer>;

describe("expenseSlice", () => {
	const mockExpense: ExpenseEntry = {
		id: "1",
		date: "2025-01-01",
		group: "Subscriptions",
		name: "Netflix",
		amount: 500,
		type: "Dr",
	};

	const initialState: ExpensesState = {
		expenses: [],
		selectedDate: "2025-01-01",
		loaded: false,
	};

	it("should handle addExpense and assign an id", () => {
		const nextState = expenseReducer(
			initialState,
			addExpense({
				date: mockExpense.date,
				group: mockExpense.group,
				name: mockExpense.name,
				amount: mockExpense.amount,
			}),
		);
		expect(nextState.expenses).toHaveLength(1);
		expect(nextState.expenses[0]).toMatchObject({
			name: "Netflix",
			amount: 500,
			type: "Dr",
		});
		expect(nextState.expenses[0].id).toBeTruthy();
	});

	it("should default salary entries to Cr on addExpense", () => {
		const nextState = expenseReducer(
			initialState,
			addExpense({
				date: "2025-01-01",
				group: "Salary",
				name: "Pay",
				amount: 1000,
			}),
		);
		expect(nextState.expenses[0].type).toBe("Cr");
	});

	it("should handle deleteExpense", () => {
		const preloadedState: ExpensesState = {
			...initialState,
			expenses: [mockExpense],
		};
		const nextState = expenseReducer(preloadedState, deleteExpense("1"));
		expect(nextState.expenses).toHaveLength(0);
	});

	it("should handle setExpenses", () => {
		const nextState = expenseReducer(initialState, setExpenses([mockExpense]));
		expect(nextState.expenses).toHaveLength(1);
		expect(nextState.loaded).toBe(true);
	});
});

describe("expenseSlice selected date", () => {
	const stateOn = (selectedDate: string): ExpensesState => ({
		expenses: [],
		selectedDate,
		loaded: true,
	});

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 9, 28, 12));
	});
	afterEach(() => vi.useRealTimers());

	it("shifts by days across a month boundary", () => {
		const next = expenseReducer(
			stateOn("2026-03-01"),
			shiftSelectedDate({ days: -1 }),
		);
		expect(next.selectedDate).toBe("2026-02-28");
	});

	it("shifts by months and clamps the day to the shorter month", () => {
		const next = expenseReducer(
			stateOn("2026-03-31"),
			shiftSelectedDate({ months: -1 }),
		);
		expect(next.selectedDate).toBe("2026-02-28");
	});

	it("rolls over the year when shifting months", () => {
		expect(
			expenseReducer(stateOn("2026-01-15"), shiftSelectedDate({ months: -1 }))
				.selectedDate,
		).toBe("2025-12-15");
		expect(
			expenseReducer(stateOn("2025-12-15"), shiftSelectedDate({ months: 1 }))
				.selectedDate,
		).toBe("2026-01-15");
	});

	it("combines days and months in one shift", () => {
		const next = expenseReducer(
			stateOn("2026-05-10"),
			shiftSelectedDate({ months: -1, days: -1 }),
		);
		expect(next.selectedDate).toBe("2026-04-09");
	});

	it("never moves past today", () => {
		expect(
			expenseReducer(stateOn("2026-10-28"), shiftSelectedDate({ days: 1 }))
				.selectedDate,
		).toBe("2026-10-28");
		expect(
			expenseReducer(stateOn("2026-09-30"), shiftSelectedDate({ months: 1 }))
				.selectedDate,
		).toBe("2026-10-28");
	});

	it("setSelectedDate accepts past dates and clamps future ones to today", () => {
		expect(
			expenseReducer(stateOn("2026-10-28"), setSelectedDate("2026-01-05"))
				.selectedDate,
		).toBe("2026-01-05");
		expect(
			expenseReducer(stateOn("2026-10-28"), setSelectedDate("2027-01-01"))
				.selectedDate,
		).toBe("2026-10-28");
	});

	it("addExpenseToSelectedDate uses the selected date and the shared type default", () => {
		const base = { name: "Lunch", amount: 10, group: "Food" };
		let state = expenseReducer(
			stateOn("2026-09-15"),
			addExpenseToSelectedDate(base),
		);
		state = expenseReducer(
			state,
			addExpenseToSelectedDate({ ...base, group: "Salary" }),
		);
		expect(state.expenses.map((e) => [e.date, e.type])).toEqual([
			["2026-09-15", "Dr"],
			["2026-09-15", "Cr"],
		]);
	});
});

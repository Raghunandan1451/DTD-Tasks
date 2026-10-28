import { describe, it, expect } from "vitest";
import {
	selectCalculatedBalance,
	selectDailyTotalsByDate,
	selectSelectedDateCredits,
	selectSelectedDateTotal,
	selectTotalAllExpenses,
} from "@src/lib/store/selectors/expenseSelectors";
import type { RootState } from "@src/lib/store/store";
import type { ExpenseEntry } from "@src/features/finance/type";

const entry = (
	id: string,
	date: string,
	amount: number,
	type?: "Dr" | "Cr",
): ExpenseEntry => ({ id, date, amount, type, group: "Food", name: id });

const buildState = (expenses: ExpenseEntry[], selectedDate: string) =>
	({
		expenses: { expenses, selectedDate, loaded: true },
		finance: { currentBalance: 1000 },
	}) as unknown as RootState;

const expenses = [
	entry("a", "2026-10-01", 100, "Dr"),
	entry("b", "2026-10-01", 40), // no type counts as a debit
	entry("c", "2026-10-01", 500, "Cr"),
	entry("d", "2026-10-02", 25, "Dr"),
];

describe("expenseSelectors totals", () => {
	it("sums debits and credits for the selected date", () => {
		const state = buildState(expenses, "2026-10-01");
		expect(selectSelectedDateTotal(state)).toBe(140);
		expect(selectSelectedDateCredits(state)).toBe(500);
	});

	it("sums every debit and derives the calculated balance", () => {
		const state = buildState(expenses, "2026-10-01");
		expect(selectTotalAllExpenses(state)).toBe(165);
		expect(selectCalculatedBalance(state)).toBe(1000 + 500 - 165);
	});

	it("returns zero totals for a date with no entries", () => {
		const state = buildState(expenses, "2026-09-01");
		expect(selectSelectedDateTotal(state)).toBe(0);
		expect(selectSelectedDateCredits(state)).toBe(0);
	});
});

describe("selectDailyTotalsByDate", () => {
	it("groups debit and credit totals by date across all expenses", () => {
		expect(selectDailyTotalsByDate(buildState(expenses, "2026-09-01"))).toEqual({
			"2026-10-01": { debit: 140, credit: 500 },
			"2026-10-02": { debit: 25, credit: 0 },
		});
	});

	it("is memoized while the expenses array is unchanged", () => {
		const first = buildState(expenses, "2026-10-01");
		const second = buildState(expenses, "2026-10-02");
		expect(selectDailyTotalsByDate(first)).toBe(selectDailyTotalsByDate(second));
	});
});

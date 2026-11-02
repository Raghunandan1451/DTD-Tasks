import { describe, expect, it } from "vitest";
import {
	expenseDaysInRange,
	selectExpenseDays,
} from "@src/lib/store/selectors/timelineExpenseSelectors";
import {
	selectDailyTotalsByDate,
	selectSelectedDateCredits,
	selectSelectedDateTotal,
} from "@src/lib/store/selectors/expenseSelectors";
import type { RootState } from "@src/lib/store/store";
import type { ExpenseEntry } from "@src/features/finance/type";

const entry = (
	id: string,
	date: string,
	amount: number,
	type?: "Dr" | "Cr",
	extra: Partial<ExpenseEntry> = {},
): ExpenseEntry => ({ id, date, amount, type, group: "Food", name: id, ...extra });

const buildState = (
	expenses: ExpenseEntry[],
	selectedDate = "2026-10-01",
	finance: object = { currentBalance: 1000 },
) =>
	({
		expenses: { expenses, selectedDate, loaded: true },
		finance,
	}) as unknown as RootState;

describe("selectExpenseDays", () => {
	it("files a past-dated expense once, under its own date", () => {
		const days = selectExpenseDays(
			buildState([
				entry("today", "2026-11-02", 10),
				entry("past", "2026-10-15", 99),
			]),
		);
		expect(days.map((d) => d.day)).toEqual(["2026-11-02", "2026-10-15"]);
		const occurrences = days.flatMap((d) => d.items).filter((e) => e.id === "past");
		expect(occurrences).toHaveLength(1);
		expect(days[1].items[0].id).toBe("past");
	});

	it("sorts newest first across month and year boundaries", () => {
		const days = selectExpenseDays(
			buildState([
				entry("a", "2025-12-31", 1),
				entry("b", "2026-01-01", 1),
				entry("c", "2026-01-09", 1),
				entry("d", "2026-01-10", 1),
			]),
		);
		expect(days.map((d) => d.day)).toEqual([
			"2026-01-10",
			"2026-01-09",
			"2026-01-01",
			"2025-12-31",
		]);
	});

	it("matches the Expenses page totals for a day with debits and credits", () => {
		const expenses = [
			entry("a", "2026-10-01", 1000, "Dr"),
			entry("b", "2026-10-01", 79, "Cr"),
			entry("c", "2026-10-01", 40), // untyped counts as a debit, as on the page
			entry("d", "2026-10-02", 25, "Dr"),
		];
		const state = buildState(expenses, "2026-10-01");
		const day = selectExpenseDays(state).find((d) => d.day === "2026-10-01");

		expect(day?.totals).toEqual({ count: 3, debit: 1040, credit: 79 });
		expect(day?.totals.debit).toBe(selectSelectedDateTotal(state));
		expect(day?.totals.credit).toBe(selectSelectedDateCredits(state));
		expect({ debit: day?.totals.debit, credit: day?.totals.credit }).toEqual(
			selectDailyTotalsByDate(state)["2026-10-01"],
		);
	});

	it("uses the line amount and ignores quantity", () => {
		const days = selectExpenseDays(
			buildState([entry("a", "2026-10-01", 120, "Dr", { quantity: 6, unit: "kg" })]),
		);
		expect(days[0].totals.debit).toBe(120);
	});

	it("ignores finance data such as salary and budgets", () => {
		const finance = {
			currentBalance: 5,
			salary: { amount: 90000, dayOfMonth: 1 },
			budgetPlansByMonth: { "2026-10": [{ amount: 500 }] },
		};
		const days = selectExpenseDays(
			buildState([entry("a", "2026-10-01", 10, "Dr")], "2026-10-01", finance),
		);
		expect(days).toHaveLength(1);
		expect(days[0].totals).toEqual({ count: 1, debit: 10, credit: 0 });
	});

	it("skips entries with a malformed date", () => {
		const days = selectExpenseDays(
			buildState([
				entry("ok", "2026-10-01", 1),
				entry("bad", "not-a-date", 1),
				entry("iso", "2026-10-01T10:00:00Z", 1),
			]),
		);
		expect(days.flatMap((d) => d.items.map((e) => e.id))).toEqual(["ok"]);
	});

	it("is memoized and updates when an expense is edited or deleted", () => {
		const expenses = [entry("a", "2026-10-01", 10, "Dr"), entry("b", "2026-10-02", 5, "Dr")];
		const state = buildState(expenses);
		const first = selectExpenseDays(state);

		// Unrelated store changes keep the same result object.
		expect(selectExpenseDays({ ...state, qr: {} } as unknown as RootState)).toBe(first);

		const edited = buildState([{ ...expenses[0], amount: 99 }, expenses[1]]);
		expect(selectExpenseDays(edited).find((d) => d.day === "2026-10-01")?.totals.debit).toBe(99);

		const deleted = buildState([expenses[1]]);
		expect(selectExpenseDays(deleted).map((d) => d.day)).toEqual(["2026-10-02"]);
	});

	it("groups 10k expenses quickly and reuses the result", () => {
		const many = Array.from({ length: 10_000 }, (_, i) => {
			const day = `${1 + (i % 28)}`.padStart(2, "0");
			const month = `${1 + (i % 12)}`.padStart(2, "0");
			return entry(`e${i}`, `2025-${month}-${day}`, i % 50, i % 7 === 0 ? "Cr" : "Dr");
		});
		const state = buildState(many);

		const started = performance.now();
		const days = selectExpenseDays(state);
		const firstRun = performance.now() - started;

		expect(days.reduce((n, d) => n + d.totals.count, 0)).toBe(10_000);
		expect(firstRun).toBeLessThan(500);
		expect(selectExpenseDays(state)).toBe(days);
	});
});

describe("expenseDaysInRange", () => {
	const days = selectExpenseDays(
		buildState([
			entry("a", "2026-10-30", 1),
			entry("b", "2026-10-15", 1),
			entry("c", "2026-10-01", 1),
			entry("d", "2026-09-30", 1),
		]),
	);

	it("keeps days inside the inclusive range, newest first", () => {
		const inRange = expenseDaysInRange(days, {
			fromDay: "2026-10-01",
			toDay: "2026-10-15",
		});
		expect(inRange.map((d) => d.day)).toEqual(["2026-10-15", "2026-10-01"]);
	});

	it("returns nothing for a range with no expenses", () => {
		expect(
			expenseDaysInRange(days, { fromDay: "2026-01-01", toDay: "2026-01-31" }),
		).toEqual([]);
	});
});

import { describe, expect, it } from "vitest";
import {
	currentPeriods,
	monthsOfPeriod,
	parsePeriod,
	periodFileName,
	periodLabel,
} from "@src/features/finance/lib/reportPeriods";
import { buildExpenseReport } from "@src/features/finance/lib/expenseReport";
import type { ExpenseEntry } from "@src/features/finance/type";

const entry = (id: string, date: string, amount: number, type: "Cr" | "Dr" = "Dr"): ExpenseEntry =>
	({ id, date, amount, type, description: id, category: "Food" }) as unknown as ExpenseEntry;

describe("report periods", () => {
	it("gives the current month, quarter and year", () => {
		const now = currentPeriods(new Date(2026, 10, 19));
		expect(now.month).toEqual({ kind: "month", month: "2026-11" });
		expect(now.quarter).toEqual({ kind: "quarter", year: 2026, quarter: 4 });
		expect(now.year).toEqual({ kind: "year", year: 2026 });
	});

	it("lists the months of a quarter and a year", () => {
		expect(monthsOfPeriod({ kind: "quarter", year: 2026, quarter: 1 })).toEqual(["2026-01", "2026-02", "2026-03"]);
		expect(monthsOfPeriod({ kind: "year", year: 2026 })).toHaveLength(12);
	});

	it("names files and titles", () => {
		expect(periodFileName({ kind: "month", month: "2026-11" })).toBe("expenses-report-2026-11.pdf");
		expect(periodFileName({ kind: "quarter", year: 2026, quarter: 4 })).toBe("expenses-report-2026-Q4.pdf");
		expect(periodFileName({ kind: "year", year: 2026 })).toBe("expenses-report-2026.pdf");
		expect(periodLabel({ kind: "quarter", year: 2026, quarter: 2 }, String)).toBe("Q2 2026");
	});

	it("rejects invalid input", () => {
		expect(parsePeriod("month", { month: "2026-13" })).toBeNull();
		expect(parsePeriod("year", { year: 0 })).toBeNull();
		expect(parsePeriod("quarter", { year: 2026, quarter: 5 })).toBeNull();
		expect(parsePeriod("quarter", { year: 2026, quarter: 3 })).toEqual({ kind: "quarter", year: 2026, quarter: 3 });
	});

	it("builds a report only from the months of the period", () => {
		const all = [entry("a", "2026-10-05", 10), entry("b", "2026-12-01", 20), entry("c", "2026-07-01", 30), entry("d", "2025-11-01", 40)];
		const q4 = buildExpenseReport({ allExpenses: all, title: "Q4", periodMonths: monthsOfPeriod({ kind: "quarter", year: 2026, quarter: 4 }) });
		expect(q4.months.map((m) => m.monthKey)).toEqual(["2026-12", "2026-10"]);
		expect(q4.totals.debits).toBe(30);
		const year = buildExpenseReport({ allExpenses: all, title: "2026", periodMonths: monthsOfPeriod({ kind: "year", year: 2026 }) });
		expect(year.totals.debits).toBe(60);
	});
});

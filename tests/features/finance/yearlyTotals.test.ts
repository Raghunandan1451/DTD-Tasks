import { describe, expect, it } from "vitest";
import type { BudgetCategory, ExpenseEntry, RecurringItem } from "@src/features/finance/type";
import { buildYearlyTotals } from "@src/features/finance/budget_planning/lib/yearlyTotals";
import { buildMonthlyFlow } from "@src/features/finance/lib/monthlyFlow";

const today = new Date(2026, 5, 15); // 15 Jun 2026

const entry = (overrides: Partial<ExpenseEntry>): ExpenseEntry => ({
	id: Math.random().toString(36).slice(2),
	date: "2026-01-10",
	group: "Food",
	name: "x",
	amount: 100,
	type: "Dr",
	...overrides,
});

const credit = (month: string, amount: number): ExpenseEntry =>
	entry({ date: `${month}-01`, group: "Salary", type: "Cr", amount, name: "Salary" });

const categories: BudgetCategory[] = [
	{ id: "needs", name: "Needs", percentage: 50, expenses: [] },
	{ id: "savings", name: "Savings", percentage: 20, expenses: [] },
];

const months = ["01", "02", "03", "04", "05", "06"].map((m) => `2026-${m}`);

describe("buildYearlyTotals", () => {
	it("sums real income for past months and estimates the rest from the salary", () => {
		const expenses = months.map((m) => credit(m, 1000));
		const totals = buildYearlyTotals({
			year: 2026,
			expenses,
			currentSalary: 1000,
			legacyCategories: categories,
			today,
		});

		expect(totals.income).toBe(12000); // 6 real + 6 estimated
		expect(totals.estimatedIncome).toBe(6000);
		expect(totals.plannedSavings).toBe(2400); // 20% of 12 x 1000
	});

	it("reports a shortfall covered from savings, and which months went over income", () => {
		const expenses = [
			...months.map((m) => credit(m, 1000)),
			entry({ date: "2026-03-10", amount: 1500 }), // March: over income
		];
		const totals = buildYearlyTotals({
			year: 2026,
			expenses,
			currentSalary: 1000,
			legacyCategories: categories,
			today,
		});

		expect(totals.spent).toBe(1500);
		expect(totals.overspentMonths).toEqual(["2026-03"]);
		expect(totals.coveredFromSavings).toBe(0); // the year as a whole still has income left

		const heavy = buildYearlyTotals({
			year: 2026,
			expenses: [...expenses, entry({ date: "2026-05-02", amount: 20000 })],
			currentSalary: 1000,
			legacyCategories: categories,
			today,
		});
		expect(heavy.result).toBe(12000 - 21500);
		expect(heavy.coveredFromSavings).toBe(9500);
	});

	it("adds recurring payments still due this year to the projection", () => {
		const recurring: RecurringItem[] = [
			{
				id: "r",
				name: "Rent",
				group: "Home",
				amount: 500,
				everyMonths: 1,
				dayOfMonth: 1,
				startMonth: "2026-01",
			},
		];
		const totals = buildYearlyTotals({
			year: 2026,
			expenses: [],
			currentSalary: 1000,
			recurring,
			today,
		});
		expect(totals.upcomingRecurring).toBe(3000); // Jul..Dec
		expect(totals.projectedSpend).toBe(3000);
	});

	it("keeps spend that is not linked to a category in the unassigned line", () => {
		const totals = buildYearlyTotals({
			year: 2026,
			expenses: [entry({ date: "2026-02-02", amount: 80 })],
			currentSalary: 1000,
			legacyCategories: categories,
			today,
		});
		expect(totals.unassigned).toBe(80);
	});

	it("handles a past year with no data", () => {
		const totals = buildYearlyTotals({ year: 2020, expenses: [], currentSalary: 0, today });
		expect(totals.income).toBe(0);
		expect(totals.coveredFromSavings).toBe(0);
		expect(totals.overspentMonths).toEqual([]);
	});
});

describe("buildMonthlyFlow", () => {
	it("returns 12 months ending now with income, spend and what was saved", () => {
		const flow = buildMonthlyFlow(
			[credit("2026-06", 3000), entry({ date: "2026-06-03", amount: 1200 })],
			undefined,
			3000,
			today,
		);
		expect(flow).toHaveLength(12);
		expect(flow[0].month).toBe("2025-07");
		const last = flow[11];
		expect(last).toMatchObject({
			month: "2026-06",
			income: 3000,
			spent: 1200,
			saved: 1800,
			estimated: false,
		});
		expect(flow[10].estimated).toBe(true);
	});
});

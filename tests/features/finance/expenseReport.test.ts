import { describe, it, expect } from "vitest";
import { buildExpenseReport } from "@src/features/finance/lib/expenseReport";
import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";

const TODAY = new Date(2026, 9, 28, 12);

let counter = 0;
const entry = (
	date: string,
	amount: number,
	group: string,
	type: "Dr" | "Cr" = "Dr",
): ExpenseEntry => ({
	id: `e${counter++}`,
	date,
	name: `${group} ${date}`,
	amount,
	group,
	type,
});

const salary = (date: string, amount = 50000) =>
	entry(date, amount, "Salary", "Cr");

const baseFinance = (overrides: Partial<FinanceState> = {}): FinanceState => ({
	salary: { amount: 50000, dayOfMonth: 1 },
	currentBalance: 20000,
	manualOverride: true,
	groups: ["Home", "Fun"],
	loaded: true,
	...overrides,
});

const rent = entry("2026-09-05", 15000, "Home");
const concert = entry("2026-09-20", 3500, "Fun");
const phone = entry("2026-09-15", 1200, "Bills");
const bonus = entry("2026-09-12", 8000, "Freelance", "Cr");

const expenses = [
	salary("2026-08-01"),
	entry("2026-08-03", 15000, "Home"),
	salary("2026-09-01"),
	rent,
	bonus,
	phone,
	concert,
	salary("2026-10-01"),
	entry("2026-10-02", 15000, "Home"),
];

const finance = baseFinance({
	budgetPlansByMonth: {
		"2026-09": [
			{
				id: "needs",
				name: "Needs",
				percentage: 50,
				expenses: [
					{ id: "b1", name: "Rent", amount: 15000, expenseId: rent.id },
				],
			},
			{
				id: "wants",
				name: "Wants",
				percentage: 30,
				expenses: [
					{ id: "b2", name: "Concert", amount: 3500, expenseId: concert.id },
				],
			},
			{ id: "savings", name: "Savings", percentage: 20 },
		],
	},
});

const report = (monthKey?: string, data: FinanceState | undefined = finance) =>
	buildExpenseReport({
		financeData: data,
		allExpenses: expenses,
		title: "Test",
		monthKey,
		today: TODAY,
	});

describe("buildExpenseReport", () => {
	it("lists months and days newest first with overall totals", () => {
		const all = report();
		expect(all.months.map((m) => m.monthKey)).toEqual([
			"2026-10",
			"2026-09",
			"2026-08",
		]);
		const september = all.months[1];
		expect(september.days.map((d) => d.date)).toEqual([
			"2026-09-20",
			"2026-09-15",
			"2026-09-12",
			"2026-09-05",
			"2026-09-01",
		]);
		expect(all.totals.credits).toBe(50000 * 3 + 8000);
		expect(all.totals.debits).toBe(15000 + 15000 + 1200 + 3500 + 15000);
		expect(all.totals.net).toBe(all.totals.credits - all.totals.debits);
	});

	it("carries the balance across months from the initial balance", () => {
		const [october, september, august] = report().months.map((m) => m.trend);
		expect(august.openingBalance).toBe(20000);
		expect(august.closingBalance).toBe(20000 + 50000 - 15000);
		expect(september.openingBalance).toBe(august.closingBalance);
		expect(october.openingBalance).toBe(september.closingBalance);
		expect(september.closingBalance).toBe(
			september.openingBalance + 58000 - 19700,
		);
	});

	it("counts manually added credits as budget income, on top of salary", () => {
		const { trend } = report().months[1];
		expect(trend.income).toEqual({ amount: 58000, isEstimated: false });
	});

	it("splits needs / wants / savings the way the Budget Planner does", () => {
		const { trend } = report().months[1];

		expect(trend.categories).toEqual([
			{
				categoryId: "needs",
				name: "Needs",
				percentage: 50,
				allocation: 29000,
				spent: 15000,
				left: 14000,
			},
			{
				categoryId: "wants",
				name: "Wants",
				percentage: 30,
				allocation: 17400,
				spent: 3500,
				left: 13900,
			},
		]);
		expect(trend.savingsPercentage).toBe(20);
		expect(trend.savingsAllocation).toBe(11600);
		// Phone (1200) is not linked to a category
		expect(trend.unassignedSpend).toBe(1200);
		expect(trend.potentialSavings).toBe(11600 + 14000 + 13900);
	});

	it("falls back to the default 50/30/20 plan and estimated salary when nothing is saved", () => {
		const { trend } = report("2026-07").months[0];
		expect(trend.income).toEqual({ amount: 50000, isEstimated: true });
		expect(trend.categories.map((c) => c.name)).toEqual(["Needs", "Wants"]);
		expect(trend.savingsAllocation).toBe(10000);
	});

	it("scoping to a month keeps only that month but uses earlier months for the opening balance", () => {
		const september = report("2026-09");
		expect(september.months).toHaveLength(1);
		expect(september.totals.credits).toBe(58000);
		expect(september.months[0].trend.openingBalance).toBe(20000 + 35000);
		expect(september.balanceSeries[0].date).toBe("2026-09-01");
		expect(september.balanceSeries.at(-1)?.date).toBe("2026-09-30");
		expect(september.balanceSeries.at(-1)?.balance).toBe(
			september.months[0].trend.closingBalance,
		);
	});

	it("still reports a requested month that has no entries", () => {
		const empty = report("2026-06");
		expect(empty.months).toHaveLength(1);
		expect(empty.months[0].days).toEqual([]);
		expect(empty.months[0].trend.closingBalance).toBe(20000);
	});

	it("stops the current month's series at today", () => {
		const october = report("2026-10");
		expect(october.balanceSeries.at(-1)?.date).toBe("2026-10-28");
	});

	it("sums the trend totals across months", () => {
		const { trendTotals, months } = report();
		expect(trendTotals.income).toBe(
			months.reduce((sum, m) => sum + m.trend.income.amount, 0),
		);
		expect(trendTotals.potentialSavings).toBe(
			months.reduce((sum, m) => sum + m.trend.potentialSavings, 0),
		);
		expect(trendTotals.debits).toBe(report().totals.debits);
	});

	it("ranks expense categories for the graph, debits only", () => {
		const { categoryTotals } = report();
		expect(categoryTotals[0]).toEqual({ group: "Home", amount: 45000 });
		expect(categoryTotals.map((c) => c.group)).not.toContain("Salary");
	});

	it("works without finance data", () => {
		const { months } = buildExpenseReport({
			financeData: undefined,
			allExpenses: expenses,
			title: "No finance",
			today: TODAY,
		});
		expect(months[0].trend.openingBalance).toBe(
			months[1].trend.closingBalance,
		);
		expect(months.at(-1)?.trend.openingBalance).toBe(0);
		// No salary configured, so estimated income is zero
		expect(months.at(-1)?.trend.income.isEstimated).toBe(false);
	});

	it("handles an empty ledger", () => {
		const empty = buildExpenseReport({
			financeData: finance,
			allExpenses: [],
			title: "Empty",
			today: TODAY,
		});
		expect(empty.months).toEqual([]);
		expect(empty.totals).toEqual({ credits: 0, debits: 0, net: 0 });
		expect(empty.categoryTotals).toEqual([]);
	});
});

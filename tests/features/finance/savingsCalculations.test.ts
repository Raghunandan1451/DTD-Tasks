import { describe, expect, it } from "vitest";
import {
	BudgetCategory,
	ExpenseEntry,
} from "@src/features/finance/type";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";
import {
	buildSnapshotEntry,
	calculatePotentialSavings,
	getSalaryForMonth,
	getEligibleSnapshotMonths,
	reconcileSavingsSnapshots,
	resolveMonthlyIncome,
	upsertSnapshot,
} from "@src/features/finance/budget_planning/lib/savingsCalculations";
import financeReducer, { setSalary } from "@src/lib/store/slices/financeSlice";
import { financeReducerForTest } from "./savingsTestUtils";

const today = new Date("2026-10-15T12:00:00");

const debit = (
	id: string,
	date: string,
	amount: number,
	group = "Food",
): ExpenseEntry => ({ id, date, name: id, amount, group, type: "Dr" });

const salary = (date: string, amount: number): ExpenseEntry => ({
	id: `salary-${date}`,
	date,
	name: "Salary",
	amount,
	group: "Salary",
	type: "Cr",
});

const credit = (date: string, amount: number, group: string): ExpenseEntry => ({
	id: `credit-${date}`,
	date,
	name: group,
	amount,
	group,
	type: "Cr",
});

const link = (
	categories: BudgetCategory[],
	categoryId: string,
	expense: ExpenseEntry,
): BudgetCategory[] =>
	categories.map((category) =>
		category.id === categoryId
			? {
					...category,
					expenses: [
						...(category.expenses ?? []),
						{
							id: `budget-expense-${expense.id}`,
							expenseId: expense.id,
							name: expense.name,
							amount: expense.amount,
						},
					],
				}
			: category,
	);

describe("calculatePotentialSavings", () => {
	it("is the sum of all allocations when nothing is spent", () => {
		const result = calculatePotentialSavings({
			categories: DEFAULT_BUDGET_CATEGORIES,
			income: 5000,
			monthlyExpenses: [],
		});
		expect(result.total).toBe(5000);
		expect(result.savingsAllocation).toBe(1000);
	});

	it("nets Needs overspend against a Wants surplus without clamping", () => {
		const needs = debit("rent", "2026-09-02", 3000);
		const wants = debit("movie", "2026-09-05", 200);
		let categories = link(DEFAULT_BUDGET_CATEGORIES, "needs", needs);
		categories = link(categories, "wants", wants);

		const result = calculatePotentialSavings({
			categories,
			income: 5000,
			monthlyExpenses: [needs, wants],
		});
		// 1000 + (2500 - 3000) + (1500 - 200)
		expect(result.total).toBe(1800);
		expect(result.breakdown[0].balance).toBe(-500);
	});

	it("goes negative when overspending exceeds the allocations", () => {
		const big = debit("car", "2026-09-02", 9000);
		const categories = link(DEFAULT_BUDGET_CATEGORIES, "needs", big);
		const result = calculatePotentialSavings({
			categories,
			income: 5000,
			monthlyExpenses: [big],
		});
		// 1000 + (2500 - 9000) + 1500
		expect(result.total).toBe(-4000);
	});

	it("ignores synthetic savings entries and reports unassigned spend", () => {
		const unlinked = debit("misc", "2026-09-09", 40);
		const categories = upsertSnapshot(
			DEFAULT_BUDGET_CATEGORIES,
			buildSnapshotEntry("2026-08", 700, false),
		);
		const result = calculatePotentialSavings({
			categories,
			income: 5000,
			monthlyExpenses: [unlinked],
		});
		expect(result.total).toBe(5000);
		expect(result.unassignedSpend).toBe(40);
	});

	it("includes custom and renamed categories", () => {
		const categories: BudgetCategory[] = [
			{ id: "needs", name: "Essentials", percentage: 40 },
			{ id: "travel", name: "Travel", percentage: 20 },
			{ id: "savings", name: "Savings", percentage: 40 },
		];
		const result = calculatePotentialSavings({
			categories,
			income: 1000,
			monthlyExpenses: [],
		});
		expect(result.breakdown.map((item) => item.name)).toEqual([
			"Essentials",
			"Travel",
		]);
		expect(result.total).toBe(1000);
	});
});

describe("resolveMonthlyIncome", () => {
	it("sums the month's salary credits", () => {
		const result = resolveMonthlyIncome(
			"2026-09",
			[salary("2026-09-01", 3000), salary("2026-09-20", 500)],
			9999,
		);
		expect(result).toEqual({ amount: 3500, isEstimated: false });
	});

	it("falls back to the current salary and flags it as estimated", () => {
		expect(resolveMonthlyIncome("2026-09", [], 4200)).toEqual({
			amount: 4200,
			isEstimated: true,
		});
	});

	it("adds manually entered credits from other groups to the salary", () => {
		const result = resolveMonthlyIncome(
			"2026-09",
			[salary("2026-09-01", 3000), credit("2026-09-12", 400, "Freelance")],
			9999,
		);
		expect(result).toEqual({ amount: 3400, isEstimated: false });
	});

	it("adds manual credits to the estimated salary when no salary credit exists yet", () => {
		const result = resolveMonthlyIncome(
			"2026-09",
			[credit("2026-09-12", 400, "Gift")],
			4200,
		);
		expect(result).toEqual({ amount: 4600, isEstimated: true });
	});

	it("ignores debits and credits from other months", () => {
		const result = resolveMonthlyIncome(
			"2026-09",
			[
				salary("2026-09-01", 3000),
				credit("2026-08-30", 700, "Gift"),
				debit("d", "2026-09-05", 50),
			],
			9999,
		);
		expect(result.amount).toBe(3000);
	});

	it("raises Potential Savings through the category allocations", () => {
		const categories = DEFAULT_BUDGET_CATEGORIES;
		const base = resolveMonthlyIncome("2026-09", [salary("2026-09-01", 3000)], 0);
		const withBonus = resolveMonthlyIncome(
			"2026-09",
			[salary("2026-09-01", 3000), credit("2026-09-10", 1000, "Bonus")],
			0,
		);
		const savings = (income: number) =>
			calculatePotentialSavings({ categories, income, monthlyExpenses: [] }).total;

		// 50/30/20 split with no spend: everything allocated counts as potential savings
		expect(savings(withBonus.amount)).toBeGreaterThan(savings(base.amount));
		expect(savings(withBonus.amount)).toBe(4000);
	});
});

describe("getEligibleSnapshotMonths", () => {
	it("derives past months from plans and debits, excluding the current one", () => {
		const months = getEligibleSnapshotMonths({
			plansByMonth: { "2026-03": DEFAULT_BUDGET_CATEGORIES },
			expenses: [
				debit("a", "2026-09-02", 10),
				debit("b", "2026-10-02", 10),
				salary("2026-07-01", 100),
			],
			today,
		});
		expect(months).toEqual(["2026-03", "2026-09"]);
	});
});

describe("upsertSnapshot", () => {
	it("replaces in place, keeps manual entries and collapses duplicates", () => {
		const manual = { id: "manual-1", name: "Bonus", amount: 10 };
		const first = buildSnapshotEntry("2026-09", 100, false);
		const categories: BudgetCategory[] = DEFAULT_BUDGET_CATEGORIES.map(
			(category) =>
				category.id === "savings"
					? { ...category, expenses: [first, manual, { ...first }] }
					: category,
		);
		const next = upsertSnapshot(
			categories,
			buildSnapshotEntry("2026-09", 250, true),
		);
		const savings = next.find((category) => category.id === "savings");
		expect(savings?.expenses).toHaveLength(2);
		expect(savings?.expenses?.[0]).toMatchObject({
			id: "auto-savings-2026-09",
			amount: 250,
			isEstimated: true,
		});
		expect(savings?.expenses?.[1]).toEqual(manual);
	});
});

describe("reconcileSavingsSnapshots", () => {
	const baseArgs = {
		legacyCategories: DEFAULT_BUDGET_CATEGORIES,
		fallbackSalary: 5000,
		today,
	};
	const apply = (
		plans: Record<string, BudgetCategory[]>,
		changes: Record<string, BudgetCategory[]>,
	) => ({ ...plans, ...changes });

	it("creates one snapshot per past month and is idempotent", () => {
		const expenses = [
			salary("2026-09-01", 5000),
			debit("a", "2026-09-04", 100),
			debit("b", "2026-08-04", 100),
		];
		const first = reconcileSavingsSnapshots({
			...baseArgs,
			plansByMonth: {},
			expenses,
		});
		expect(Object.keys(first).sort()).toEqual(["2026-08", "2026-09"]);

		const second = reconcileSavingsSnapshots({
			...baseArgs,
			plansByMonth: apply({}, first),
			expenses,
		});
		expect(second).toEqual({});
	});

	it("marks months without a salary credit as estimated", () => {
		const changes = reconcileSavingsSnapshots({
			...baseArgs,
			plansByMonth: {},
			expenses: [debit("b", "2026-08-04", 100)],
		});
		const entry = changes["2026-08"]
			.find((category) => category.id === "savings")
			?.expenses?.[0];
		expect(entry?.isEstimated).toBe(true);
		expect(entry?.amount).toBe(5000);
	});

	it("updates only the month whose history changed", () => {
		const expenses = [
			salary("2026-09-01", 5000),
			debit("a", "2026-09-04", 100),
			debit("b", "2026-08-04", 100),
		];
		const plans = apply(
			{},
			reconcileSavingsSnapshots({ ...baseArgs, plansByMonth: {}, expenses }),
		);
		// Link a debit to Needs in September so its snapshot changes
		const linked = link(plans["2026-09"], "needs", expenses[1]);
		const updatedPlans = { ...plans, "2026-09": linked };

		const changes = reconcileSavingsSnapshots({
			...baseArgs,
			plansByMonth: updatedPlans,
			expenses,
		});
		expect(Object.keys(changes)).toEqual(["2026-09"]);
		const savings = changes["2026-09"].find((c) => c.id === "savings");
		expect(savings?.expenses).toHaveLength(1);
		expect(savings?.expenses?.[0].amount).toBe(4900);
	});

	it("skips months without income or without a Savings category", () => {
		expect(
			reconcileSavingsSnapshots({
				...baseArgs,
				fallbackSalary: 0,
				plansByMonth: {},
				expenses: [debit("a", "2026-08-04", 10)],
			}),
		).toEqual({});
		expect(
			reconcileSavingsSnapshots({
				...baseArgs,
				plansByMonth: {
					"2026-08": [{ id: "needs", name: "Needs", percentage: 100 }],
				},
				expenses: [debit("a", "2026-08-04", 10)],
			}),
		).toEqual({});
	});

	it("preserves manual savings entries", () => {
		const manual = { id: "manual-1", name: "Bonus", amount: 10 };
		const plan = DEFAULT_BUDGET_CATEGORIES.map((category) =>
			category.id === "savings" ? { ...category, expenses: [manual] } : category,
		);
		const changes = reconcileSavingsSnapshots({
			...baseArgs,
			plansByMonth: { "2026-08": plan },
			expenses: [salary("2026-08-01", 5000), debit("a", "2026-08-04", 10)],
		});
		const savings = changes["2026-08"].find((c) => c.id === "savings");
		expect(savings?.expenses?.[0]).toEqual(manual);
		expect(savings?.expenses).toHaveLength(2);
	});
});

describe("applyBudgetPlans", () => {
	it("merges several months without touching others", () => {
		const state = financeReducerForTest(
			{ "2026-01": DEFAULT_BUDGET_CATEGORIES },
			{
				"2026-02": DEFAULT_BUDGET_CATEGORIES,
				"2026-03": DEFAULT_BUDGET_CATEGORIES,
			},
		);
		expect(Object.keys(state.budgetPlansByMonth ?? {}).sort()).toEqual([
			"2026-01",
			"2026-02",
			"2026-03",
		]);
	});
});

describe("salary raises do not rewrite earlier months", () => {
	const history = [
		{ from: "0000-00", amount: 4000 },
		{ from: "2026-10", amount: 6000 },
	];

	it("resolves the salary in effect for each month", () => {
		expect(getSalaryForMonth("2026-09", history, 6000)).toBe(4000);
		expect(getSalaryForMonth("2026-10", history, 6000)).toBe(6000);
		expect(getSalaryForMonth("2026-09", undefined, 6000)).toBe(6000);
	});

	it("keeps credit-less past months on the old salary and stays stable after the raise", () => {
		const args = {
			legacyCategories: DEFAULT_BUDGET_CATEGORIES,
			expenses: [debit("a", "2026-09-04", 0)],
			today,
		};
		const before = reconcileSavingsSnapshots({
			...args,
			plansByMonth: {},
			fallbackSalary: 4000,
		});
		const plans = before;
		const after = reconcileSavingsSnapshots({
			...args,
			plansByMonth: plans,
			fallbackSalary: 6000,
			salaryHistory: history,
		});
		expect(after).toEqual({});
		const entry = plans["2026-09"]
			.find((category) => category.id === "savings")
			?.expenses?.[0];
		expect(entry?.amount).toBe(4000);
	});

	it("records history in setSalary, replacing a same-month edit", () => {
		let state = financeReducer(undefined, { type: "test/init" });
		state = financeReducer(state, setSalary({ amount: 4000, dayOfMonth: 1 }));
		expect(state.salaryHistory).toBeUndefined();
		state = financeReducer(state, setSalary({ amount: 6000, dayOfMonth: 1 }));
		state = financeReducer(state, setSalary({ amount: 6500, dayOfMonth: 1 }));
		expect(state.salaryHistory).toHaveLength(2);
		expect(state.salaryHistory?.[0]).toEqual({ from: "0000-00", amount: 4000 });
		expect(state.salaryHistory?.[1].amount).toBe(6500);
	});
});

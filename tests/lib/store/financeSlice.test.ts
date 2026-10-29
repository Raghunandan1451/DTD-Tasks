// tests/lib/store/financeSlice.test.ts
import financeReducer, {
	addGroup,
	applyBudgetPlans,
	removeGroup,
	setBudgetPlanForMonth,
	setCurrentBalance,
	setFinanceState,
	setSalary,
} from "@src/lib/store/slices/financeSlice";
import { recordSalaryChange } from "@src/features/finance/lib/salaryHistory";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { BudgetCategory, FinanceState } from "@src/features/finance/type";

const freshState = (): FinanceState =>
	financeReducer(undefined, { type: "test/init" });

describe("financeSlice", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 9, 28, 12));
	});
	afterEach(() => vi.useRealTimers());

	describe("setSalary", () => {
		it("stores the salary and stamps lastUpdatedDate with the local date", () => {
			const next = financeReducer(
				freshState(),
				setSalary({ amount: 50000, dayOfMonth: 1 }),
			);
			expect(next.salary).toEqual({ amount: 50000, dayOfMonth: 1 });
			expect(next.lastUpdatedDate).toBe("2026-10-28");
			expect(next.salaryHistory).toBeUndefined();
		});

		it("records history, keeping the original amount for earlier months", () => {
			let state = financeReducer(
				freshState(),
				setSalary({ amount: 50000, dayOfMonth: 1 }),
			);
			state = financeReducer(state, setSalary({ amount: 60000, dayOfMonth: 1 }));
			expect(state.salaryHistory).toEqual([
				{ from: "0000-00", amount: 50000 },
				{ from: "2026-10", amount: 60000 },
			]);
		});

		it("updates the current month's entry instead of adding a second one", () => {
			let state = financeReducer(
				freshState(),
				setSalary({ amount: 50000, dayOfMonth: 1 }),
			);
			state = financeReducer(state, setSalary({ amount: 60000, dayOfMonth: 1 }));
			state = financeReducer(state, setSalary({ amount: 70000, dayOfMonth: 1 }));
			expect(state.salaryHistory).toEqual([
				{ from: "0000-00", amount: 50000 },
				{ from: "2026-10", amount: 70000 },
			]);
		});

		it("does not touch history when only the payday changes", () => {
			let state = financeReducer(
				freshState(),
				setSalary({ amount: 50000, dayOfMonth: 1 }),
			);
			state = financeReducer(state, setSalary({ amount: 50000, dayOfMonth: 15 }));
			expect(state.salary?.dayOfMonth).toBe(15);
			expect(state.salaryHistory).toBeUndefined();
		});
	});

	it("setCurrentBalance sets the balance, enables manual override and stamps the date", () => {
		const next = financeReducer(freshState(), setCurrentBalance(25000));
		expect(next.currentBalance).toBe(25000);
		expect(next.manualOverride).toBe(true);
		expect(next.lastUpdatedDate).toBe("2026-10-28");
	});

	it("addGroup ignores duplicates and removeGroup deletes", () => {
		let state = financeReducer(freshState(), addGroup("Food"));
		state = financeReducer(state, addGroup("Food"));
		expect(state.groups.filter((g) => g === "Food")).toHaveLength(1);
		state = financeReducer(state, removeGroup("Food"));
		expect(state.groups).not.toContain("Food");
	});

	describe("budget plans", () => {
		const plan = (id: string): BudgetCategory[] => [
			{ id, name: id, percentage: 100 },
		];

		it("setBudgetPlanForMonth stores a plan for one month", () => {
			const next = financeReducer(
				freshState(),
				setBudgetPlanForMonth({ month: "2026-09", categories: plan("a") }),
			);
			expect(next.budgetPlansByMonth).toEqual({ "2026-09": plan("a") });
		});

		it("applyBudgetPlans merges into existing plans and overwrites matching months", () => {
			let state = financeReducer(
				freshState(),
				setBudgetPlanForMonth({ month: "2026-08", categories: plan("a") }),
			);
			state = financeReducer(
				state,
				applyBudgetPlans({ "2026-08": plan("b"), "2026-09": plan("c") }),
			);
			expect(state.budgetPlansByMonth).toEqual({
				"2026-08": plan("b"),
				"2026-09": plan("c"),
			});
		});
	});

	it("setFinanceState merges persisted data and marks the slice loaded", () => {
		const persisted: FinanceState = {
			...freshState(),
			salary: { amount: 120000, dayOfMonth: 5 },
			currentBalance: 60000,
			manualOverride: true,
			loaded: false,
		};
		const next = financeReducer(freshState(), setFinanceState(persisted));
		expect(next).toEqual({ ...persisted, loaded: true });
	});
});

describe("recordSalaryChange", () => {
	it("does not mutate the history it is given", () => {
		const history = [{ from: "0000-00", amount: 100 }];
		const next = recordSalaryChange(history, 100, 200, "2026-10");
		expect(history).toEqual([{ from: "0000-00", amount: 100 }]);
		expect(next).toEqual([
			{ from: "0000-00", amount: 100 },
			{ from: "2026-10", amount: 200 },
		]);
	});
});

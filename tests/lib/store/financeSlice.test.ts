// tests/store/financeSlice.test.ts
import financeReducer, {
	setSalary,
	setCurrentBalance,
	resetBalanceToAuto,
	setFinanceState,
} from "@src/lib/store/slices/financeSlice";
import { describe, it, expect } from "vitest";
import type { FinanceState, SalaryConfig } from "@src/lib/types/finance";

describe("financeSlice", () => {
	const initialState: FinanceState = {
		salary: null,
		currentBalance: 0,
		manualOverride: false,
		loaded: false,
	};

	it("should handle setSalary", () => {
		const salary: SalaryConfig = {
			amount: 600000,
			frequency: "yearly",
			startDate: "2025-01-01",
		};

		const nextState = financeReducer(initialState, setSalary(salary));
		expect(nextState.salary).toEqual(salary);
	});

	it("should handle setCurrentBalance and enable manual override", () => {
		const nextState = financeReducer(
			initialState,
			setCurrentBalance(25000)
		);
		expect(nextState.currentBalance).toBe(25000);
		expect(nextState.manualOverride).toBe(true);
	});

	it("should handle resetBalanceToAuto", () => {
		const stateWithManual = { ...initialState, manualOverride: true };
		const nextState = financeReducer(stateWithManual, resetBalanceToAuto());
		expect(nextState.manualOverride).toBe(false);
	});

	it("should handle setFinanceState and mark as loaded", () => {
		const newState: FinanceState = {
			salary: {
				amount: 120000,
				frequency: "monthly",
				startDate: "2025-02-01",
			},
			currentBalance: 60000,
			manualOverride: true,
			loaded: false,
		};
		const nextState = financeReducer(
			initialState,
			setFinanceState(newState)
		);
		expect(nextState).toEqual({ ...newState, loaded: true });
	});
});

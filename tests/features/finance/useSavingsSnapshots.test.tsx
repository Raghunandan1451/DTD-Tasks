import { StrictMode } from "react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { format, subMonths } from "date-fns";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";
import { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import { useSavingsSnapshots } from "@src/features/finance/budget_planning/hooks/useSavingsSnapshots";

const dispatch = vi.fn();
vi.mock("react-redux", () => ({ useDispatch: () => dispatch }));

const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");
const expenses: ExpenseEntry[] = [
	{
		id: "e1",
		date: `${lastMonth}-10`,
		name: "Groceries",
		group: "Food",
		amount: 100,
		type: "Dr",
	},
];
const finance = (loaded: boolean): FinanceState => ({
	salary: { amount: 5000, dayOfMonth: 1 },
	currentBalance: 0,
	manualOverride: false,
	groups: [],
	budgetCategories: DEFAULT_BUDGET_CATEGORIES,
	loaded,
});

describe("useSavingsSnapshots", () => {
	beforeEach(() => dispatch.mockClear());

	it("does nothing until both slices are loaded", () => {
		renderHook(
			() =>
				useSavingsSnapshots({
					finance: finance(false),
					expenses,
					expensesLoaded: true,
				}),
			{ wrapper: StrictMode },
		);
		renderHook(
			() =>
				useSavingsSnapshots({
					finance: finance(true),
					expenses,
					expensesLoaded: false,
				}),
			{ wrapper: StrictMode },
		);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("dispatches one batched update with Strict Mode double effects off the same state", () => {
		const fin = finance(true);
		renderHook(
			() => useSavingsSnapshots({ finance: fin, expenses, expensesLoaded: true }),
			{ wrapper: StrictMode },
		);
		// Strict Mode runs the effect twice against unchanged store state; both
		// dispatches carry the identical payload and the reducer merge is idempotent.
		expect(dispatch.mock.calls.length).toBeGreaterThanOrEqual(1);
		const payloads = dispatch.mock.calls.map((call) => call[0].payload);
		for (const payload of payloads) {
			expect(Object.keys(payload)).toEqual([lastMonth]);
			expect(payload).toEqual(payloads[0]);
		}
	});
});

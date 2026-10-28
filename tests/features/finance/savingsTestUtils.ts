import financeReducer, {
	applyBudgetPlans,
} from "@src/lib/store/slices/financeSlice";
import { BudgetCategory } from "@src/features/finance/type";

/** Runs `applyBudgetPlans` against a finance state that already holds `existing` plans */
export const financeReducerForTest = (
	existing: Record<string, BudgetCategory[]>,
	payload: Record<string, BudgetCategory[]>,
) => {
	const initial = {
		...financeReducer(undefined, { type: "test/init" }),
		budgetPlansByMonth: existing,
	};
	return financeReducer(initial, applyBudgetPlans(payload));
};

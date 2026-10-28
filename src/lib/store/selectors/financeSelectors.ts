import { RootState } from "@src/lib/store/store";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";

// Stable reference so selectors never hand back a fresh [] on every call
const NO_GROUPS: string[] = [];

export const selectFinance = (state: RootState) => state.finance;
export const selectFinanceLoaded = (state: RootState) => state.finance.loaded;
export const selectSalary = (state: RootState) => state.finance.salary;
export const selectSalaryHistory = (state: RootState) =>
	state.finance.salaryHistory;
export const selectCurrentBalance = (state: RootState) =>
	state.finance.currentBalance;
export const selectManualOverride = (state: RootState) =>
	state.finance.manualOverride;
export const selectFinanceGroups = (state: RootState) =>
	state.finance.groups ?? NO_GROUPS;

/** Legacy (current-month) budget categories, falling back to the defaults. */
export const selectBudgetCategories = (state: RootState) =>
	state.finance.budgetCategories ?? DEFAULT_BUDGET_CATEGORIES;
export const selectBudgetPlansByMonth = (state: RootState) =>
	state.finance.budgetPlansByMonth;

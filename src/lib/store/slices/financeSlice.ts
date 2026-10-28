// financeSlice.ts - Updated with proper lastUpdatedDate handling
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { format } from "date-fns";
import {
	BudgetCategory,
	FinanceState,
	DatedSalary,
} from "@src/features/finance/type";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";
import { recordSalaryChange } from "@src/features/finance/lib/salaryHistory";
import { todayISO } from "@src/lib/utils/isoDate";

const initialState: FinanceState = {
	salary: null,
	currentBalance: 0,
	manualOverride: false,
	groups: ["Miscellaneous"],
	budgetCategories: DEFAULT_BUDGET_CATEGORIES,
	loaded: false,
	lastUpdatedDate: undefined,
};

const financeSlice = createSlice({
	name: "finance",
	initialState,
	reducers: {
		setSalary(state, action: PayloadAction<DatedSalary>) {
			const previous = state.salary;
			if (previous && previous.amount !== action.payload.amount) {
				state.salaryHistory = recordSalaryChange(
					state.salaryHistory,
					previous.amount,
					action.payload.amount,
					format(new Date(), "yyyy-MM"),
				);
			}
			state.salary = action.payload;
			state.lastUpdatedDate = todayISO();
		},
		setCurrentBalance(state, action: PayloadAction<number>) {
			state.currentBalance = action.payload;
			state.manualOverride = true;
			state.lastUpdatedDate = todayISO();
		},
		addGroup(state, action: PayloadAction<string>) {
			if (!state.groups.includes(action.payload)) {
				state.groups.push(action.payload);
			}
		},
		removeGroup(state, action: PayloadAction<string>) {
			state.groups = state.groups.filter((g) => g !== action.payload);
		},
		setBudgetPlanForMonth(
			state,
			action: PayloadAction<{ month: string; categories: BudgetCategory[] }>,
		) {
			state.budgetPlansByMonth ??= {};
			state.budgetPlansByMonth[action.payload.month] =
				action.payload.categories;
		},
		applyBudgetPlans(
			state,
			action: PayloadAction<Record<string, BudgetCategory[]>>,
		) {
			state.budgetPlansByMonth = {
				...state.budgetPlansByMonth,
				...action.payload,
			};
		},
		setFinanceState(state, action: PayloadAction<FinanceState>) {
			return { ...state, ...action.payload, loaded: true };
		},
	},
});

export const {
	setSalary,
	setCurrentBalance,
	addGroup,
	removeGroup,
	setBudgetPlanForMonth,
	applyBudgetPlans,
	setFinanceState,
} = financeSlice.actions;

export default financeSlice.reducer;

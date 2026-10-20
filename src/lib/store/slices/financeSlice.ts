// financeSlice.ts - Updated with proper lastUpdatedDate handling
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
	BudgetCategory,
	FinanceState,
	DatedSalary,
} from "@src/features/finance/type";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";

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
			state.salary = action.payload;
			state.lastUpdatedDate = new Date().toISOString().split("T")[0];
		},
		setCurrentBalance(state, action: PayloadAction<number>) {
			state.currentBalance = action.payload;
			state.manualOverride = true;
			state.lastUpdatedDate = new Date().toISOString().split("T")[0];
		},
		addGroup(state, action: PayloadAction<string>) {
			if (!state.groups.includes(action.payload)) {
				state.groups.push(action.payload);
			}
		},
		removeGroup(state, action: PayloadAction<string>) {
			state.groups = state.groups.filter((g) => g !== action.payload);
		},
		setBudgetCategories(state, action: PayloadAction<BudgetCategory[]>) {
			state.budgetCategories = action.payload;
		},
		setBudgetPlanForMonth(
			state,
			action: PayloadAction<{ month: string; categories: BudgetCategory[] }>,
		) {
			state.budgetPlansByMonth ??= {};
			state.budgetPlansByMonth[action.payload.month] =
				action.payload.categories;
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
	setBudgetCategories,
	setBudgetPlanForMonth,
	setFinanceState,
} = financeSlice.actions;

export default financeSlice.reducer;

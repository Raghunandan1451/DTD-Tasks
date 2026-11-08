// financeSlice.ts - Updated with proper lastUpdatedDate handling
import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import { format } from "date-fns";
import {
	BudgetCategory,
	FinanceState,
	DatedSalary,
	RecurringItem,
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
		addRecurring(
			state,
			action: PayloadAction<Omit<RecurringItem, "id" | "lastPosted">>,
		) {
			state.recurring ??= [];
			state.recurring.push({ ...action.payload, id: nanoid() });
		},
		updateRecurring(state, action: PayloadAction<RecurringItem>) {
			const list = state.recurring ?? [];
			const index = list.findIndex((item) => item.id === action.payload.id);
			if (index >= 0) {
				// lastPosted belongs to the posting job, not the edit form
				list[index] = { ...action.payload, lastPosted: list[index].lastPosted };
			}
		},
		removeRecurring(state, action: PayloadAction<string>) {
			state.recurring = (state.recurring ?? []).filter(
				(item) => item.id !== action.payload,
			);
		},
		setRecurringPaused(
			state,
			action: PayloadAction<{ id: string; paused: boolean }>,
		) {
			const item = (state.recurring ?? []).find(
				(entry) => entry.id === action.payload.id,
			);
			if (item) item.paused = action.payload.paused;
		},
		markRecurringPosted(
			state,
			action: PayloadAction<{ id: string; date: string }>,
		) {
			const item = (state.recurring ?? []).find(
				(entry) => entry.id === action.payload.id,
			);
			if (item && (!item.lastPosted || item.lastPosted < action.payload.date)) {
				item.lastPosted = action.payload.date;
			}
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
	addRecurring,
	updateRecurring,
	removeRecurring,
	setRecurringPaused,
	markRecurringPosted,
	setFinanceState,
} = financeSlice.actions;

export default financeSlice.reducer;

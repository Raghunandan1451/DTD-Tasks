// financeSlice.ts - Updated with proper lastUpdatedDate handling
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FinanceState, DatedSalary } from "@src/lib/types/finance";

const initialState: FinanceState = {
	salary: null,
	currentBalance: 0,
	manualOverride: false,
	groups: ["Miscellaneous"],
	loaded: false,
	lastUpdatedDate: undefined,
};

const financeSlice = createSlice({
	name: "finance",
	initialState,
	reducers: {
		setSalary(state, action: PayloadAction<DatedSalary>) {
			state.salary = action.payload;
			// CRITICAL: Update lastUpdatedDate when salary is set/changed
			state.lastUpdatedDate = new Date().toISOString().split("T")[0];
		},
		setCurrentBalance(state, action: PayloadAction<number>) {
			state.currentBalance = action.payload;
			state.manualOverride = true;
			// CRITICAL: Update lastUpdatedDate when balance is manually set
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
		setFinanceState(state, action: PayloadAction<FinanceState>) {
			return { ...state, ...action.payload, loaded: true };
		},
		// Action to update just the lastUpdatedDate (for external use)
		updateLastUpdatedDate(state) {
			state.lastUpdatedDate = new Date().toISOString().split("T")[0];
		},
		// New action to update salary configuration (amount + day)
		updateSalaryConfig(
			state,
			action: PayloadAction<{ amount?: number; dayOfMonth?: number }>
		) {
			if (state.salary) {
				if (action.payload.amount !== undefined) {
					state.salary.amount = action.payload.amount;
				}
				if (action.payload.dayOfMonth !== undefined) {
					state.salary.dayOfMonth = action.payload.dayOfMonth;
				}
				// Update lastUpdatedDate when salary config changes
				state.lastUpdatedDate = new Date().toISOString().split("T")[0];
			}
		},
	},
});

export const {
	setSalary,
	setCurrentBalance,
	addGroup,
	removeGroup,
	setFinanceState,
	updateLastUpdatedDate,
	updateSalaryConfig,
} = financeSlice.actions;

export default financeSlice.reducer;

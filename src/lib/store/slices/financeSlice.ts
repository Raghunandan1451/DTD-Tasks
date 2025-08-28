// financeSlice.ts
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
		},
		setCurrentBalance(state, action: PayloadAction<number>) {
			state.currentBalance = action.payload;
			state.manualOverride = true;
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
	},
});

export const {
	setSalary,
	setCurrentBalance,
	addGroup,
	removeGroup,
	setFinanceState,
} = financeSlice.actions;

export default financeSlice.reducer;

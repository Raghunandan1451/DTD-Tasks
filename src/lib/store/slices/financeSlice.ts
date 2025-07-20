import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SalaryConfig, FinanceState } from "@src/lib/types/expense";

const initialState: FinanceState = {
	salary: null,
	currentBalance: 0,
	manualOverride: false,
	loaded: false,
};

const financeSlice = createSlice({
	name: "finance",
	initialState,
	reducers: {
		setSalary: (state, action: PayloadAction<SalaryConfig>) => {
			state.salary = action.payload;
		},
		setCurrentBalance: (state, action: PayloadAction<number>) => {
			state.currentBalance = action.payload;
			state.manualOverride = true;
		},
		resetBalanceToAuto: (state) => {
			state.manualOverride = false;
		},
		setFinanceState: (_, action: PayloadAction<FinanceState>) => ({
			...action.payload,
			loaded: true,
		}),
	},
});

export const {
	setSalary,
	setCurrentBalance,
	resetBalanceToAuto,
	setFinanceState,
} = financeSlice.actions;
export default financeSlice.reducer;

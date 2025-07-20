import { createAsyncThunk } from "@reduxjs/toolkit";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import { FinanceState } from "@src/lib/types/expense";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";

export const hydrateFinance = createAsyncThunk(
	"finance/hydrate",
	async (_, { dispatch }) => {
		const data = await getFromIndexedDB<FinanceState>("redux_finance_data");
		if (data) dispatch(setFinanceState(data));
	}
);

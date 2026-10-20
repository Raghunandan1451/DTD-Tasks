import { createAsyncThunk } from "@reduxjs/toolkit";
import { getAppData } from "@src/lib/utils/fileStorage/appData";
import { FinanceState } from "@src/features/finance/type";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";

export const hydrateFinance = createAsyncThunk(
	"finance/hydrate",
	async (_, { dispatch }) => {
		const data = await getAppData<FinanceState>("redux_finance_data");
		if (data) dispatch(setFinanceState(data));
	}
);

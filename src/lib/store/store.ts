import { configureStore } from "@reduxjs/toolkit";
import { persistMiddleware } from "@src/lib/utils/persistMiddleware";
import qrSettingReducer from "@src/lib/store/slices/qrSettingSlice";
import markdownReducer from "@src/lib/store/slices/markdownSlice";
import financeReducer from "@src/lib/store/slices/financeSlice";
import expenseReducer from "@src/lib/store/slices/expensesSlice";

const store = configureStore({
	reducer: {
		qr: qrSettingReducer,
		fileManager: markdownReducer,
		finance: financeReducer,
		expenses: expenseReducer,
	},
	middleware: (getDefaultMiddleware) => {
		return getDefaultMiddleware().concat(persistMiddleware);
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

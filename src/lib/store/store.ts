import { configureStore } from "@reduxjs/toolkit";
import { persistMiddleware } from "@src/lib/utils/persistMiddleware";
import qrSettingReducer from "@src/lib/store/slices/qrSettingSlice";
import markdownReducer from "@src/lib/store/slices/markdownSlice";
import financeReducer from "@src/lib/store/slices/financeSlice";
import expenseReducer from "@src/lib/store/slices/expensesSlice";
import calendarReducer from "@src/lib/store/slices/calendarSlice";

const store = configureStore({
	reducer: {
		qr: qrSettingReducer,
		fileManager: markdownReducer,
		finance: financeReducer,
		expenses: expenseReducer,
		calendar: calendarReducer,
	},
	middleware: (getDefaultMiddleware) => {
		return getDefaultMiddleware().concat(persistMiddleware);
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

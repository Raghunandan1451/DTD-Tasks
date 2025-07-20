import { configureStore } from "@reduxjs/toolkit";
import { persistMiddleware } from "@src/lib/utils/persistMiddleware";
import qrSettingReducer from "@src/lib/store/slices/qrSettingSlice";
import markdownReducer from "@src/lib/store/slices/markdownSlice";
import expenseReducer from "@src/lib/store/slices/expenseSlice";
import financeReducer from "@src/lib/store/slices/financeSlice";

const store = configureStore({
	reducer: {
		qr: qrSettingReducer,
		fileManager: markdownReducer,

		expenses: expenseReducer,
		finance: financeReducer,
	},
	middleware: (getDefaultMiddleware) => {
		return getDefaultMiddleware().concat(persistMiddleware);
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

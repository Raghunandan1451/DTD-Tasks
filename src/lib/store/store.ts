import { configureStore } from "@reduxjs/toolkit";
import todoReducer from "@src/lib/store/todoSlice";
import shoppingReducer from "@src/lib/store/shoppingSlice";
import qrSettingReducer from "@src/lib/store/qrSettingSlice";
import markdownReducer from "@src/lib/store/markdownSlice";
import { persistMiddleware } from "@src/lib/utils/persistMiddleware";

const store = configureStore({
	reducer: {
		todos: todoReducer,
		shopping: shoppingReducer,
		qr: qrSettingReducer,
		fileManager: markdownReducer,
	},
	middleware: (getDefaultMiddleware) => {
		return getDefaultMiddleware().concat(persistMiddleware);
	},
});

export type RootState = ReturnType<typeof store.getState>;

export default store;

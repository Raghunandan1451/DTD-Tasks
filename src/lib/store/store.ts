import { configureStore } from "@reduxjs/toolkit";
import qrSettingReducer from "@src/lib/store/slices/qrSettingSlice";
import markdownReducer from "@src/lib/store/slices/markdownSlice";
import { persistMiddleware } from "@src/lib/utils/persistMiddleware";

const store = configureStore({
	reducer: {
		qr: qrSettingReducer,
		fileManager: markdownReducer,
	},
	middleware: (getDefaultMiddleware) => {
		return getDefaultMiddleware().concat(persistMiddleware);
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

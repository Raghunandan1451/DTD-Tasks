import { configureStore } from '@reduxjs/toolkit';
import todoReducer from '@src/store/todoSlice';
import shoppingReducer from '@src/store/shoppingSlice';
import qrSettingReducer from '@src/store/qrSettingSlice';
import markdownReducer from '@src/store/markdownSlice';
import { persistMiddleware } from '@src/utils/persistMiddleware';

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

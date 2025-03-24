import { configureStore } from '@reduxjs/toolkit';
import todoReducer from '@store/todoSlice';
import shoppingReducer from '@store/shoppingSlice';
import qrSettingReducer from '@store/qrSettingSlice';
import markdownReducer from '@store/markdownSlice';

export type RootState = ReturnType<typeof store.getState>;

const store = configureStore({
	reducer: {
		todos: todoReducer,
		shopping: shoppingReducer,
		qr: qrSettingReducer,
		fileManager: markdownReducer,
	},
});

export default store;

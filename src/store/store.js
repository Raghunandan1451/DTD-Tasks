import { configureStore } from '@reduxjs/toolkit';
import todoReducer from '@store/todoSlice';
import shoppingReducer from '@store/shoppingSlice';
import qrSettingReducer from '@store/qrSettingSlice';

const store = configureStore({
	reducer: {
		todos: todoReducer,
		shopping: shoppingReducer,
		qrSetting: qrSettingReducer,
	},
});

export default store;

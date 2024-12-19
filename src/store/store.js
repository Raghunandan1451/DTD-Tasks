import { configureStore } from '@reduxjs/toolkit';
import todoReducer from '@store/todoSlice';
import shoppingReducer from '@store/shoppingSlice';

const store = configureStore({
	reducer: {
		todos: todoReducer,
		shopping: shoppingReducer,
	},
});

export default store;

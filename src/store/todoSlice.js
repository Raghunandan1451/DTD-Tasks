import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = [
	{
		uid: nanoid(),
		task: '',
		target: '',
		status: '',
	},
];
const todoSlice = createSlice({
	name: 'todos',
	initialState,
	reducers: {
		addTodo: (state, action) => {
			state.push({
				uid: nanoid(),
				...action.payload,
			});
		},
		updateTodo: (state, action) => {
			const { id, key, value } = action.payload;
			const row = state.find((row) => row.uid === id);
			if (row) {
				row[key] = value;
			}
		},
		deleteTodo: (state, action) => {
			return state.filter((row) => row.uid !== action.payload);
		},
	},
});

export const { addTodo, updateTodo, deleteTodo } = todoSlice.actions;
export default todoSlice.reducer;

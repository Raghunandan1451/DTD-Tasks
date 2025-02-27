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
			if (action.payload.length === 1) {
				// Clear data for the first row without removing it
				return state.map((row) =>
					row.uid === action.payload.uid
						? {
								uid: row.uid,
								task: '',
								target: '',
								status: '',
						  }
						: row
				);
			}
			return state.filter((row) => row.uid !== action.payload.uid);
		},
	},
});

export const { addTodo, updateTodo, deleteTodo } = todoSlice.actions;
export default todoSlice.reducer;

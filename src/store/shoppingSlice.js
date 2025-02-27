import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = [
	{
		uid: nanoid(),
		productName: '',
		quantity: '',
		unit: '',
	},
];
const shoppingSlice = createSlice({
	name: 'shopping',
	initialState,
	reducers: {
		addItem: (state, action) => {
			state.push({
				uid: nanoid(),
				...action.payload,
			});
		},
		updateItem: (state, action) => {
			const { id, key, value } = action.payload;
			const row = state.find((row) => row.uid === id);
			if (row) {
				row[key] = value;
			}
		},
		deleteItem: (state, action) => {
			if (action.payload.length === 1) {
				// Clear data for the first row without removing it
				return state.map((row) =>
					row.uid === action.payload.uid
						? {
								uid: row.uid,
								productName: '',
								quantity: '',
								unit: '',
						  }
						: row
				);
			}
			return state.filter((row) => row.uid !== action.payload.uid);
		},
	},
});

export const { addItem, updateItem, deleteItem } = shoppingSlice.actions;
export default shoppingSlice.reducer;

import { createSlice, nanoid } from '@reduxjs/toolkit';

interface Shopping {
	uid: string;
	productName: string;
	quantity: string;
	unit: string;
}

const initialState: Shopping[] = [
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
		addItem: (
			state: Shopping[],
			action: { payload: Omit<Shopping, 'uid'> }
		) => {
			state.push({
				uid: nanoid(),
				...action.payload,
			});
		},
		updateItem: (
			state: Shopping[],
			action: {
				payload: { id: string; key: keyof Shopping; value: string };
			}
		) => {
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

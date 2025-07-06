import { createSlice, nanoid } from "@reduxjs/toolkit";
import { getFromLocalStorage } from "@src/lib/utils/persistMiddleware";

interface Todo {
	uid: string;
	task: string;
	target: string;
	status: string;
}

const getInitialState = (): Todo[] => {
	const storedData = getFromLocalStorage<Todo[]>("redux_todo_data");
	return storedData || [{ uid: nanoid(), task: "", target: "", status: "" }];
};
const todoSlice = createSlice({
	name: "todos",
	initialState: getInitialState(),
	reducers: {
		addTodo: (state: Todo[], action: { payload: Omit<Todo, "uid"> }) => {
			state.push({
				uid: nanoid(),
				...action.payload,
			});
		},
		updateTodo: (
			state: Todo[],
			action: { payload: { id: string; key: keyof Todo; value: string } }
		) => {
			const { id, key, value } = action.payload;
			const row = state.find((row) => row.uid === id);
			if (row) {
				row[key] = value;
			}
		},
		deleteTodo: (state: Todo[], action) => {
			if (action.payload.length === 1) {
				// Clear data for the first row without removing it
				return state.map((row) =>
					row.uid === action.payload.uid
						? {
								uid: row.uid,
								task: "",
								target: "",
								status: "",
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

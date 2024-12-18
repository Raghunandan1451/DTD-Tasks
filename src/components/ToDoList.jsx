/* eslint-disable react/prop-types */
import EditableTable from './Table/EditableTable';
import { useDispatch, useSelector } from 'react-redux';
import { addTodo, deleteTodo, updateTodo } from '../store/todoSlice';

const columns = [
	{ key: 'task', type: 'text', header: 'Task', className: 'w-1/2' },
	{
		key: 'target',
		type: 'date',
		header: 'Target Date',
		className: 'w-1/5',
	},
	{
		key: 'status',
		type: 'dropdown',
		header: 'Status',
		className: 'w-1/5',
		options: ['Not Started', 'In Progress', 'Completed'],
	},
];
const TodoList = () => {
	const todoList = useSelector((state) => state.todos);
	const dispatch = useDispatch();

	const handleUpdate = (id, key, value) => {
		dispatch(updateTodo({ id, key, value })); // Dispatch Redux action
	};

	const handleAddRow = () => {
		dispatch(addTodo({ task: '', target: '', status: '' })); // Dispatch Redux action
	};

	const handleDeleteRow = (id) => {
		dispatch(deleteTodo(id)); // Dispatch Redux action
	};
	return (
		<>
			<h1 className="text-4xl text-center flex-shrink-0 font-bold mb-3">
				To-Do List
			</h1>
			<EditableTable
				columns={columns}
				data={todoList}
				onUpdate={handleUpdate}
				onAddRow={handleAddRow}
				onDeleteRow={handleDeleteRow}
			/>
		</>
	);
};

export default TodoList;

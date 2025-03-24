import { useDispatch, useSelector } from 'react-redux';

import CustomTable from '@components/organisms/Table/CustomTable';
import { addTodo, deleteTodo, updateTodo } from '@store/todoSlice';
import TitleWithButton from '@components/molecules/Header/TitleWithButton';
import { handleDownloadPDF } from '@utils/downloadList';
import NotificationCenter from '@components/NotificationCeter';
import useNotifications from '@src/hooks/useNotifications';
import { RootState } from '@store/store';
import { Column, RowData } from '@src/components/shared/table';

interface Todo {
	uid: string;
	task: string;
	target: string;
	status: string;
}

const columns: Column[] = [
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
const TodoPage = () => {
	const todoList: Todo[] = useSelector((state: RootState) => state.todos);
	const dispatch = useDispatch();
	const { notifications, showNotification } = useNotifications();

	const handleUpdate = (id: string, key: string, value: string) => {
		if (!['uid', 'task', 'target', 'status'].includes(key)) return;
		dispatch(updateTodo({ id, key: key as keyof Todo, value })); // Dispatch Redux action
	};

	const handleAddRow = () => {
		dispatch(addTodo({ task: '', target: '', status: '' })); // Dispatch Redux action
	};

	const handleDeleteRow = (id: string) => {
		dispatch(deleteTodo(id)); // Dispatch Redux action
	};

	const handleDownload = (heading: string) => {
		handleDownloadPDF(todoList, columns, heading, showNotification);
	};

	const formattedData: RowData[] = todoList.map((todo) => ({ ...todo }));

	return (
		<>
			<TitleWithButton
				heading="To-Do List"
				onDownload={handleDownload}
				buttonText="Download PDF"
			/>
			<CustomTable
				columns={columns}
				data={formattedData}
				onUpdate={handleUpdate}
				onAddRow={handleAddRow}
				onDeleteRow={handleDeleteRow}
				showNotification={showNotification}
			/>
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default TodoPage;

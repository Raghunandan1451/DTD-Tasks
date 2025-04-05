import { useDispatch, useSelector } from 'react-redux';

import CustomTable from '@src/components/organisms/Table/CustomTable';
import { addTodo, deleteTodo, updateTodo } from '@src/store/todoSlice';
import TitleWithButton from '@src/components/molecules/Header/TitleWithButton';
import { handleDownloadPDF } from '@src/utils/downloadHandler';
import NotificationCenter from '@src/components/organisms/Notifications/NotificationCenter';
import useNotifications from '@src/hooks/useNotifications';
import { RootState } from '@src/store/store';
import { Column, DeleteParams, RowData } from '@src/components/shared/table';

interface TodoProp {
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
const Todo = () => {
	const todoList: TodoProp[] = useSelector((state: RootState) => state.todos);
	const dispatch = useDispatch();
	const { notifications, showNotification } = useNotifications();

	const formattedData: RowData[] = todoList.map((todo) => ({ ...todo }));

	const handleUpdate = (id: string, key: string, value: string) => {
		if (!['uid', 'task', 'target', 'status'].includes(key)) return;
		dispatch(updateTodo({ id, key: key as keyof TodoProp, value })); // Dispatch Redux action
	};

	const handleAddRow = () => {
		dispatch(addTodo({ task: '', target: '', status: '' })); // Dispatch Redux action
	};

	const handleDeleteRow = (parans: DeleteParams) => {
		dispatch(deleteTodo(parans)); // Dispatch Redux action
	};

	const handleDownload = (heading: string) => {
		handleDownloadPDF(formattedData, columns, heading, showNotification);
	};

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

export default Todo;

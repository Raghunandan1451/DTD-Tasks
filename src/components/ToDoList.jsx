/* eslint-disable react/prop-types */
import EditableTable from './Table/EditableTable';

const TodoList = () => {
	return (
		<>
			<h1 className="text-4xl text-center flex-shrink-0 font-bold mb-3">
				To-Do List
			</h1>
			<EditableTable />
		</>
	);
};

export default TodoList;

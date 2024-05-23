/* eslint-disable react/prop-types */
import { addTodo, deleteItem, updateTodo} from '../utils/ADU'
import InputForm from './InputForm';
import ListItem from './ListItem';

const addStyle = {flexGrow: '0.13'}
const listStyle = {textAlign: 'left'}

const TodoList = (props) => {
	const { handleDownload, items, setItems, idCounter, setIdCounter } = props
  
	const handleAddItem = (newItem) => {
		const itemWithId = { ...newItem, id: idCounter };
		addTodo(items, itemWithId, setItems);
		setIdCounter(idCounter + 1);
	};

	const handleDeleteItem = (index) => {
		deleteItem(items, index, setItems);
	};

	const handleUpdateItem = (newItem) => {
		updateTodo(items, newItem, setItems);
	};

  return (
    <div className="p-4 border rounded shadow">
		<div className={`flex p-3 justify-between`}>
			<h2 className="text-xl font-bold mb-4">To-Do List</h2>
			<button
				onClick={() => handleDownload(items)}
				className="bg-green-500 text-white p-2 rounded"
			>
				Download
			</button>
		</div>
		<InputForm
			onAddItem={handleAddItem}
			placeholders={[{ name: 'name', placeholder: 'Enter task' }]}
			addStyle={addStyle}
		/>
		<ul className="space-y-2">
			{items.map((item) => (
			<ListItem
				key={item.id}
				fields={[{ name: 'name'}]}
				item={item}
				onUpdateItem={handleUpdateItem}
				onDeleteItem={handleDeleteItem}
				addStyle={listStyle}
			/>
			))}
		</ul>
    </div>
  );
}

export default TodoList;

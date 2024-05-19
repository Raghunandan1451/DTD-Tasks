import { useState } from 'react';
import { addTodo, deleteItem, updateTodo} from '../utils/ADU'
import InputForm from './InputForm';
import ListItem from './ListItem';

const addStyle = {flexGrow: '0.13'}
const listStyle = {textAlign: 'left'}

const TodoList = () => {
	const [items, setItems] = useState([]);
	const [idCounter, setIdCounter] = useState(0);
  
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
		<h2 className="text-xl font-bold mb-4">To-Do List</h2>
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

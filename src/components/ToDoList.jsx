import { useState } from 'react';
import { addTodo, deleteItem, updateTodo} from '../utils/ADU'
import InputForm from './InputForm';
import ListItem from './ListItem';

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
    <div>
		<h2 className='text-2xl font-bold'>To-Do List</h2>
		<InputForm
			onAddItem={handleAddItem}
			placeholders={[{ name: 'name', placeholder: 'Enter task' }]}
		/>
		<ul>
			{items.map((item) => (
			<ListItem
				key={item.id}
				fields={[{ name: 'name'}]}
				item={item}
				onUpdateItem={handleUpdateItem}
				onDeleteItem={handleDeleteItem}
			/>
			))}
		</ul>
    </div>
  );
}

export default TodoList;

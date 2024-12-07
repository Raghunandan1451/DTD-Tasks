import { useState } from 'react';
import TodoList from '../components/ToDoList';
import ShoppingList from '../components/ShoppingList';
// import { downloadShoppingList, downloadTodoList } from '../utils/downloadList';
import ListSelector from '../components/ListSelector';

const ToList = () => {
	const [activeList, setActiveList] = useState('todo');

	const [todoList, setTodoList] = useState([]);
	const [shoppingList, setShoppingList] = useState([]);
	const [todoCounter, setTodoCounter] = useState(0);
	const [shoppingCounter, setShoppingCounter] = useState(0);

	const handleListView = (id) => {
		setActiveList(id);
	};

	// const handleDownloadClick = (items) => {
	// 	if (activeList === 'todo') {
	// 		downloadTodoList(items);
	// 	} else {
	// 		downloadShoppingList(items);
	// 	}
	// };

	return (
		<div className="flex h-full gap-4">
			<ListSelector handleListView={handleListView} />
			<section className="flex flex-col grow">
				{activeList === 'todo' && (
					<TodoList
						// handleDownload={handleDownloadClick}
						items={todoList}
						setItems={setTodoList}
						idCounter={todoCounter}
						setIdCounter={setTodoCounter}
					/>
				)}
				{activeList === 'shopping' && (
					<ShoppingList
						// handleDownload={handleDownloadClick}
						items={shoppingList}
						setItems={setShoppingList}
						idCounter={shoppingCounter}
						setIdCounter={setShoppingCounter}
					/>
				)}
			</section>
		</div>
	);
};

export default ToList;

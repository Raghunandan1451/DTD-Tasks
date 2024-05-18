import { useState } from "react";
import TodoList from "../components/ToDoList";
import ShoppingList from "../components/ShoppingList";

const ToList = () => {
	const [activeList, setActiveList] = useState('todo');
	const listNames = [
		{
			id: 'todo',
			name: 'To-Do List'
		},
		{
			id: 'shopping',
			name: 'Shopping List'
		}
	];

	const handleButtonClick = (id) => {
		setActiveList(id);
	};

	return (
		<div>
			<div>
				{listNames.map(({id, name}, index) => (
					<button key={index} onClick={() => handleButtonClick(id)}>
						{name}
					</button>
				))}
			</div>
			{activeList === 'todo' && <TodoList />}
			{activeList === 'shopping' && <ShoppingList />}
		</div>
	)
}

export default ToList
import { useState } from 'react';
import InputForm from './InputForm';
import ListItem from './ListItem';
import { addShoppingItem, deleteItem, updateShoppingItem } from '../utils/ADU';

const fields = [
    { name: 'name', placeholder: 'Enter item' },
    { name: 'quantity', placeholder: 'Quantity', type: 'number' },
    {
		name: 'measure',
		placeholder: 'Measure',
		type: 'select',
		options: [
			{ value: 'pkt', label: 'PKT(S)' },
			{ value: 'kg', label: 'KG' },
			{ value: 'g', label: 'G' },
			{ value: 'pc', label: 'PC(S)' },
			{ value: 'l', label: 'L' },
			{ value: 'ml', label: 'ML' }
		]
    }
];

const addStyle = {flexGrow: '0.6'}

const ShoppingList = () => {
	const [items, setItems] = useState([]);
	const [idCounter, setIdCounter] = useState(0);
  
	const handleAddItem = (newItem) => {
		const itemWithId = { ...newItem, id: idCounter };
		addShoppingItem(items, itemWithId, setItems);
		setIdCounter((prev) => prev + 1);
	};
  
	const handleUpdateItem = (updatedItem) => {
		updateShoppingItem(items, updatedItem, setItems);
	};
  
	const handleDeleteItem = (id) => {
		deleteItem(items, id, setItems);
	};

	return (
		<div className="p-4 border rounded shadow">
			<h2 className="text-xl font-bold mb-4">Shopping List</h2>
			<InputForm onAddItem={handleAddItem} placeholders={fields} addStyle={addStyle} />
			<ul className="space-y-2">
				{items.map((item) => (
					<ListItem
						key={item.id}
						item={item}
						onUpdateItem={handleUpdateItem}
						onDeleteItem={handleDeleteItem}
						fields={fields}
					/>
				))}
			</ul>
		</div>
		);
}

export default ShoppingList
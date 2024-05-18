import { useState } from 'react';
import InputForm from './InputForm';
import ListItem from './ListItem';
import { addShoppingItem, deleteItem, updateShoppingItem } from '../utils/ADU';

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
		<div>
			<h2>Shopping List</h2>
			<InputForm
			onAddItem={handleAddItem}
			placeholders={[
				{ name: 'name', placeholder: 'Enter item' },
				{ name: 'quantity', placeholder: 'Quantity', type: 'number' },
				{
					name: 'measure',
					placeholder: 'Select',
					type: 'select',
					options: [
						{ value: 'pkt', label: 'pkt(s)' },
						{ value: 'kg', label: 'kg' },
						{ value: 'g', label: 'grams' },
						{ value: 'pc', label: 'pc(s)' },
						{ value: 'l', label: 'litres' },
						{ value: 'ml', label: 'ml' }
					]
				}
			]}
			/>
			<ul>
			{items.map((item) => (
				<ListItem
				key={item.id}
				item={item}
				onUpdateItem={handleUpdateItem}
				onDeleteItem={handleDeleteItem}
				fields={[
					{ name: 'name' },
					{ name: 'quantity', type: 'number' },
					{
						name: 'measure',
						type: 'select',
						options: [
							{ value: 'pkt', label: 'pkt(s)' },
							{ value: 'kg', label: 'kg' },
							{ value: 'g', label: 'grams' },
							{ value: 'pc', label: 'pc(s)' },
							{ value: 'l', label: 'litres' },
							{ value: 'ml', label: 'ml' }
						]
					}
				]}
				/>
			))}
			</ul>
		</div>
		);
}

export default ShoppingList
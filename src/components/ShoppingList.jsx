/* eslint-disable react/prop-types */
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
			{ value: 'ml', label: 'ML' },
		],
	},
];

const addStyle = { flexGrow: '0.6' };

const ShoppingList = (props) => {
	const {
		// handleDownload,
		items,
		setItems,
		idCounter,
		setIdCounter,
	} = props;

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
			<div className={`flex justify-between p-3`}>
				<h2 className="text-xl font-bold mb-4">Shopping List</h2>
				<span>
					<button
						// onClick={() => handleDownload(items)}
						className="bg-green-500 text-white p-2 rounded">
						Download
					</button>
				</span>
			</div>
			<InputForm
				onAddItem={handleAddItem}
				placeholders={fields}
				addStyle={addStyle}
			/>
			<ul className="space-y-2">
				{items
					? items.map((item) => (
							<ListItem
								key={item.id}
								item={item}
								onUpdateItem={handleUpdateItem}
								onDeleteItem={handleDeleteItem}
								fields={fields}
							/>
					  ))
					: null}
			</ul>
		</div>
	);
};

export default ShoppingList;

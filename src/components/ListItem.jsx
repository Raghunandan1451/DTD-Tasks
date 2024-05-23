/* eslint-disable react/prop-types */

import { useState } from "react";

const ListItem = (props) => {
	
	const { item, onUpdateItem, onDeleteItem, fields, addStyle } = props

	const [isEditing, setIsEditing] = useState(false);
	const [editItem, setEditItem] = useState(item);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setEditItem({ ...editItem, [name]: value });
	};

	const handleEditClick = () => {
		setIsEditing(true);
	};

	const handleSaveClick = () => {
		onUpdateItem(editItem);
		setIsEditing(false);
	};

	const handleCancelClick = () => {
		setEditItem(item);
		setIsEditing(false);
	};
	const handleDeleteClick = () => {
		onDeleteItem(item.id);
	};
	const handleToggleDone = () => {
		onUpdateItem({ ...item, done: !item.done });
	};

	return (
		<li className={`flex items-center justify-between py-2`}>
			{isEditing ? (
				<>
				{fields.map((field, index) => {
					if (field.type === 'select') {
						return (
							<select
							key={index}
							name={field.name}
							value={editItem[field.name]}
							onChange={handleChange}
							className="border border-gray-300 rounded p-2"
							>
							{field.options.map((option, optionIndex) => (
								<option key={optionIndex} value={option.value}>
								{option.label}
								</option>
							))}
							</select>
						);
					}
					return (
						<input
							key={index}
							type={field.type || 'text'}
							name={field.name}
							value={editItem[field.name]}
							onChange={handleChange}
							className="border border-gray-300 rounded p-2"
						/>
					);
				})}
				<div className="flex gap-2">
					<button 
						onClick={handleSaveClick} 
						className="bg-green-500 text-white p-2 rounded"
					>
						Save
					</button>
					<button 
						onClick={handleCancelClick} 
						className="bg-gray-500 text-white p-2 rounded"
					>
						Cancel
					</button>
				</div>
				</>
			) : (
				<>
					{fields.map((field, index) => (
						<span 
							className={`flex-1 text-center p-2 ${item.done ? 'line-through' : ''}`}
							onClick={handleToggleDone} 
							key={index} 
							style={addStyle}
						>
							{item[field.name]}
						</span>
					))}
					<div className="flex gap-2">
						<button 
							onClick={handleEditClick} 
							className="bg-yellow-500 text-white p-2 rounded"
						>
							Edit
						</button>
						<button 
							onClick={handleDeleteClick} 
							className="bg-red-500 text-white p-2 rounded"
						>
							Delete
						</button>
					</div>
				</>
			)}
		</li>
	);
}

export default ListItem;

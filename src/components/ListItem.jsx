/* eslint-disable react/prop-types */

import { useState } from "react";

const ListItem = (props) => {
	
	const { item, onUpdateItem, onDeleteItem, fields } = props

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

	return (
		<li>
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
					/>
					);
				})}
				<button onClick={handleSaveClick}>Save</button>
				<button onClick={handleCancelClick}>Cancel</button>
				</>
			) : (
				<>
					{fields.map((field, index) => (
						<span key={index}>{item[field.name]} </span>
					))}
					<button onClick={handleEditClick}>Edit</button>
					<button onClick={handleDeleteClick}>Delete</button>
				</>
			)}
		</li>
	);
}

export default ListItem;

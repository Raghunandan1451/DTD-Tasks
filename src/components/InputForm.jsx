/* eslint-disable react/prop-types */
import { useState } from 'react';

const InputForm = (props) => {
	const { onAddItem, placeholders, addStyle } = props
	const [inputs, setInputs] = useState({});

	const handleInputChange = (event) => {
		const { name, value } = event.target;
		setInputs((prevInputs) => ({ ...prevInputs, [name]: value }));
	};

	const handleSubmit = () => {
		onAddItem(inputs);
		setInputs({});
	};

	return (
		<div className="mb-4 flex flex-wrap gap-2">
			{placeholders.map((placeholder, index) => {
				if (placeholder.type === 'select') {
					return (
						<select 
							key={index} 
							name={placeholder.name} 
							value={inputs[placeholder.name] || ''} 
							onChange={handleInputChange}
							className="border border-gray-300 rounded p-2 flex-grow">
						<option value="">{placeholder.placeholder}</option>
						{placeholder.options.map((option, optionIndex) => (
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
						type={placeholder.type || 'text'}
						name={placeholder.name}
						value={inputs[placeholder.name] || ''}
						onChange={handleInputChange}
						placeholder={placeholder.placeholder}
						min={0}
						className="border border-gray-300 rounded p-2 flex-grow"
					/>
				);
			})}
			<button onClick={handleSubmit} className="bg-blue-500 text-white p-2 rounded" style={addStyle}>Add</button>
		</div>
	);
}

export default InputForm;

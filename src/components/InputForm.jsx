/* eslint-disable react/prop-types */
import { useState } from 'react';

const InputForm = (props) => {
	const { onAddItem, placeholders } = props
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
		<div>
			{placeholders.map((placeholder, index) => {
				if (placeholder.type === 'select') {
					return (
						<select key={index} name={placeholder.name} value={inputs[placeholder.name] || ''} onChange={handleInputChange}>
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
					/>
				);
			})}
			<button onClick={handleSubmit}>Add</button>
		</div>
	);
}

export default InputForm;

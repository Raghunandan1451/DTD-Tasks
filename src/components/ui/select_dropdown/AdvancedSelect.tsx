import React from 'react';

interface SelectProps<T> {
	id: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	className?: string;
	options: T[];
	getOptionProps: (option: T) => { value: string; label: string };
	placeholder?: string;
	isDisabled?: boolean;
}

const AdvancedSelect = <T,>({
	id,
	value,
	onChange,
	className,
	options,
	getOptionProps,
	placeholder = 'Select an option',
	isDisabled = true,
}: SelectProps<T>) => {
	return (
		<select
			id={id}
			name={id}
			value={value}
			onChange={onChange}
			className={`w-full bg-white/10 dark:bg-gray-700/30 text-black dark:text-white p-1 backdrop-blur-sm outline-none ${className || ''}`}>
			<option
				value=""
				disabled={isDisabled}
				className="text-black dark:text-white bg-white dark:bg-gray-800">
				{placeholder}
			</option>
			{options.map((option, index) => {
				const { value: optionValue, label: optionLabel } =
					getOptionProps(option);

				return (
					<option
						key={index}
						value={optionValue}
						className="text-black dark:text-white bg-white dark:bg-gray-800">
						{optionLabel}
					</option>
				);
			})}
		</select>
	);
};

export default AdvancedSelect;

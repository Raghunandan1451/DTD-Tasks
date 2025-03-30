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
			className={`w-full bg-transparent outline-hidden ${className}`}>
			<option
				value=""
				disabled={isDisabled}
				className="dark:text-white dark:bg-gray-800">
				{placeholder}
			</option>
			{options.map((option, index) => {
				const { value: optionValue, label: optionLabel } =
					getOptionProps(option);

				return (
					<option
						key={index}
						value={optionValue}
						className="dark:text-white dark:bg-gray-800">
						{optionLabel}
					</option>
				);
			})}
		</select>
	);
};

export default AdvancedSelect;

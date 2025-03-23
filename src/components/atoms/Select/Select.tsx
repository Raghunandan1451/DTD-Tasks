import React from 'react';

interface BaseSelectProps {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	onFocus?: () => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
	selectRef: (el: HTMLSelectElement | null) => void;
	className?: string;
	options: string[];
	placeholder?: string;
}

const Select: React.FC<BaseSelectProps> = ({
	value,
	onChange,
	onFocus,
	onKeyDown,
	selectRef,
	className,
	options,
	placeholder = 'Select an option',
}) => {
	return (
		<select
			value={value}
			onChange={onChange}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			ref={selectRef}
			className={`w-full bg-transparent outline-hidden ${className}`}>
			<option
				value=""
				className="dark:text-white dark:bg-gray-800"
				disabled>
				{placeholder}
			</option>
			{options.map((option, index) => (
				<option
					key={index}
					value={option}
					className="dark:text-white dark:bg-gray-800">
					{option}
				</option>
			))}
		</select>
	);
};

export default Select;

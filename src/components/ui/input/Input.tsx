import React from 'react';

export interface BaseInputProps {
	id: string;
	type?: string;
	value: string | number | undefined;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onFocus?: () => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	inputRef?: (el: HTMLInputElement | null) => void;
	className?: string;
	min?: string;
	max?: string;
	placeholder?: string;
}

const Input: React.FC<BaseInputProps> = ({
	id,
	type = 'text',
	value,
	onChange,
	onFocus,
	onKeyDown,
	inputRef,
	className,
	min,
	max,
	placeholder,
}) => {
	return (
		<input
			id={id}
			name={id}
			type={type}
			value={value || ''}
			onChange={onChange}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			ref={inputRef}
			className={`w-full bg-white/10 dark:bg-gray-700/30 text-black dark:text-white p-1 backdrop-blur-sm outline-none ${className || ''}`}
			min={min}
			max={max}
			placeholder={placeholder}
			autoFocus
		/>
	);
};

export default Input;

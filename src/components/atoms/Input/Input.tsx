import React from 'react';

interface BaseInputProps {
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
	className = 'w-full',
	min,
	max,
	placeholder,
}) => {
	return (
		<input
			id={id}
			type={type}
			value={value || ''}
			onChange={onChange}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			ref={inputRef}
			className={`bg-transparent outline-hidden ${className}`}
			min={min}
			max={max}
			placeholder={placeholder}
			autoFocus
		/>
	);
};

export default Input;

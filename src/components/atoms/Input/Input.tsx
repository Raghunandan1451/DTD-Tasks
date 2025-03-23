import React from 'react';

interface BaseInputProps {
	type?: 'text' | 'number' | 'date';
	value: string | number | undefined;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onFocus?: () => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	inputRef?: (el: HTMLInputElement | null) => void;
	className?: string;
	min?: string;
	max?: string;
}

const Input: React.FC<BaseInputProps> = ({
	type = 'text',
	value,
	onChange,
	onFocus,
	onKeyDown,
	inputRef,
	className,
	min,
	max,
}) => {
	return (
		<input
			type={type}
			value={value || ''}
			onChange={onChange}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			ref={inputRef}
			className={`w-full bg-transparent outline-hidden ${className}`}
			min={min}
			max={max}
			autoFocus
		/>
	);
};

export default Input;

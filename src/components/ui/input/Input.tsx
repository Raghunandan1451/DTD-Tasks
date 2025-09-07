import React from "react";

export interface BaseInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	id: string;
	type?: string;
	value: string | number | undefined;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onFocus?: () => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	inputRef?: (el: HTMLInputElement | null) => void;
	className?: string;
	min?: number | string;
	max?: number | string;
	placeholder?: string;
}

const Input: React.FC<BaseInputProps> = ({
	id,
	type = "text",
	value,
	onChange,
	onFocus,
	onKeyDown,
	inputRef,
	className,
	...rest
}) => {
	return (
		<input
			id={id}
			name={id}
			type={type}
			value={value || ""}
			onChange={onChange}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			ref={inputRef}
			className={`w-full bg-white/10 dark:bg-gray-700/30 text-black dark:text-white p-1 backdrop-blur-sm outline-none ${
				className || ""
			}`}
			{...rest}
		/>
	);
};

export default Input;

import React from 'react';

interface ButtonProps {
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	className?: string;
	disabled?: boolean;
	type?: 'button' | 'submit' | 'reset' | undefined;
	text?: string;
	children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
	onClick,
	className,
	disabled = false,
	type = 'button',
	text,
	children,
	...props
}) => {
	return (
		<button
			onClick={onClick}
			className={className}
			disabled={disabled}
			type={type}
			{...props}>
			{children}
			{text && <span>{text}</span>}
		</button>
	);
};

export default Button;

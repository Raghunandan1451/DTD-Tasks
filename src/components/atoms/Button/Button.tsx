import React from 'react';

interface ButtonProps {
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	className?: string;
	disabled?: boolean;
	type?: 'button' | 'submit' | 'reset' | undefined;
	text?: string;
}

const Button: React.FC<ButtonProps> = ({
	onClick,
	className,
	disabled = false,
	type = 'button',
	text = 'Download',
}) => {
	return (
		<button
			onClick={onClick}
			className={`text-white py-1 px-2 rounded-sm ${className}`}
			disabled={disabled}
			type={type}>
			{text}
		</button>
	);
};

export default Button;

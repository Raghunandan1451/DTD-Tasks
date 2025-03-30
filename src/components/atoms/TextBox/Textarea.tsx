import React from 'react';

type TextareaProps = {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	placeholder?: string;
	className?: string;
	rows?: number;
};

const Textarea: React.FC<TextareaProps> = ({
	value,
	onChange,
	placeholder = 'Start writing...',
	className,
	rows = 3,
}) => {
	return (
		<textarea
			value={value}
			onChange={onChange}
			className={`bg-transparent outline-hidden resize-none ${className}`}
			rows={rows}
			placeholder={placeholder}
			autoFocus
		/>
	);
};

export default Textarea;

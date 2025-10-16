import React, { forwardRef } from "react";

type TextareaProps = {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	placeholder?: string;
	className?: string;
	rows?: number;
	onScroll?: () => void;
	textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			value,
			onChange,
			placeholder = "Start writing...",
			className,
			rows = 3,
			onScroll,
			textareaRef,
		},
		ref
	) => {
		const finalRef = textareaRef || ref;

		return (
			<textarea
				ref={finalRef as React.RefObject<HTMLTextAreaElement>}
				value={value}
				onChange={onChange}
				onScroll={onScroll}
				className={`bg-transparent outline-hidden resize-none ${className} scrollbar-hide`}
				rows={rows}
				placeholder={placeholder}
				autoFocus
			/>
		);
	}
);

Textarea.displayName = "Textarea";

export default Textarea;

import { JSX, useRef, ReactNode } from "react";
import { FieldConfig, FormHandlers } from "@src/lib/types/form";
import GenericFormField from "./GenericFormField";
import Button from "@src/components/ui/button/Button";

interface GenericFormProps<T> {
	fields: FieldConfig<T>[];
	formData: T;
	handlers: FormHandlers<T>;
	submitButton: {
		text: string;
		className?: string;
	};
	className?: string;
	firstFieldRef?: (el: HTMLInputElement | null) => void;
	autoFocusFirst?: boolean;
	children?: ReactNode;
}

const GenericForm = <T,>({
	fields,
	formData,
	handlers,
	submitButton,
	className = "",
	firstFieldRef,
	autoFocusFirst = false,
	children,
}: GenericFormProps<T>): JSX.Element => {
	const formRef = useRef<HTMLFormElement | null>(null);

	return (
		<form
			ref={formRef}
			onSubmit={handlers.handleSubmit}
			className={`flex flex-wrap gap-2 items-end mb-4 ${className}`}
		>
			{fields.map((field, index) => (
				<GenericFormField
					key={String(field.key)}
					field={field}
					value={String(formData?.[field.key] || "")}
					handlers={handlers}
					inputRef={index === 0 ? firstFieldRef : undefined}
					autoFocus={index === 0 && autoFocusFirst}
				/>
			))}

			<Button
				type="submit"
				className={`flex-[0.7] min-w-[80px] w-full backdrop-blur-md bg-blue-500/80 dark:bg-blue-600/70 hover:bg-blue-600/90 dark:hover:bg-blue-500/80 border border-blue-400/50 dark:border-blue-500/50 text-white rounded-lg px-2 py-1 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 ${
					submitButton.className || ""
				}`}
				text={submitButton.text}
			/>

			{children}
		</form>
	);
};

export default GenericForm;

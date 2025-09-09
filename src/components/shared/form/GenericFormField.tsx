import { JSX } from "react";
import { FieldConfig, FormHandlers } from "@src/lib/types/form";
import Input from "@src/components/ui/input/Input";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";

interface GenericFormFieldProps<T> {
	field: FieldConfig<T>;
	value: string | number;
	handlers: FormHandlers<T>;
	inputRef?: (el: HTMLInputElement | null) => void;
	autoFocus?: boolean;
}

const GenericFormField = <T,>({
	field,
	value,
	handlers,
	inputRef,
	autoFocus = false,
}: GenericFormFieldProps<T>): JSX.Element => {
	const baseClassName =
		"backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-lg shadow-lg focus:bg-white/30 dark:focus:bg-white/15 focus:border-white/50 dark:focus:border-white/30 transition-all duration-300 placeholder:text-gray-700 dark:placeholder:text-gray-300 text-gray-800 dark:text-gray-200";

	const fieldClassName = `${
		field.width || "flex-1"
	} min-w-[100px] w-full ${baseClassName} ${field.className || ""}`;

	if (field.type === "select") {
		return (
			<SimpleSelect
				id={String(field.key)}
				value={String(value)}
				onChange={(e) =>
					handlers.handleChange(field.key, e.target.value)
				}
				options={field.options || []}
				placeholder={field.placeholder}
				className={fieldClassName}
				onKeyDown={handlers.handleKeyDown}
				{...field.inputProps}
			/>
		);
	}

	if (field.type === "number") {
		return (
			<Input
				inputRef={inputRef}
				id={String(field.key)}
				type="number"
				value={String(value)}
				onChange={(e) =>
					handlers.handleChange(field.key, e.target.value)
				}
				placeholder={field.placeholder}
				className={`${fieldClassName} number-input-noappearance`}
				onKeyDown={handlers.handleKeyDown}
				autoFocus={autoFocus}
				min={field.validation?.min}
				max={field.validation?.max}
				{...field.inputProps}
			/>
		);
	}

	// Default to input type
	return (
		<Input
			inputRef={inputRef}
			id={String(field.key)}
			type="text"
			value={String(value)}
			onChange={(e) => handlers.handleChange(field.key, e.target.value)}
			placeholder={field.placeholder}
			className={fieldClassName}
			onKeyDown={handlers.handleKeyDown}
			autoFocus={autoFocus}
			{...field.inputProps}
		/>
	);
};

export default GenericFormField;

export interface FieldConfig<T> {
	key: keyof T;
	type: "input" | "select" | "number";
	placeholder?: string;
	label?: string;
	options?: string[];
	className?: string;
	width?: string;
	validation?: {
		required?: boolean;
		min?: number;
		max?: number;
		pattern?: RegExp;
	};
	inputProps?: Record<string, unknown>;
}

export interface FormHandlers<T> {
	handleChange: (field: keyof T, value: string | number) => void;
	handleKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
	handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

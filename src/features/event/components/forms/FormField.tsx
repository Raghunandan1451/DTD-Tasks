import React from "react";
import { Clock, Tag, Calendar, Repeat } from "lucide-react";
import Input from "@src/components/ui/input/Input";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";
import {
	FormField as FormFieldType,
	EventFormData,
} from "@src/features/event/type";

interface FormFieldProps {
	field: FormFieldType;
	formData: EventFormData;
	onFieldChange: (field: FormFieldType, value: string | number) => void;
	commonInputStyles: string;
}

// Icon mapping
const getIcon = (iconName?: string) => {
	switch (iconName) {
		case "tag":
			return <Tag className="w-4 h-4 inline mr-1" />;
		case "calendar":
			return <Calendar className="w-4 h-4 inline mr-1" />;
		case "clock":
			return <Clock className="w-4 h-4 inline mr-1" />;
		case "repeat":
			return <Repeat className="w-4 h-4 inline mr-1" />;
		default:
			return null;
	}
};
const spanClassMap: Record<number, string> = {
	1: "col-span-1",
	2: "col-span-2",
	3: "col-span-3",
	4: "col-span-4",
	5: "col-span-5",
};
export const FormField: React.FC<FormFieldProps> = ({
	field,
	formData,
	onFieldChange,
	commonInputStyles,
}) => {
	const isDisabled = field.disabled && field.disabled(formData);
	const fieldValue = formData[field.key];
	const minValue = field.key === "endDate" ? formData.startDate : field.min;

	const fieldClasses = `${spanClassMap[field.span] || ""} ${
		isDisabled ? "opacity-30" : "opacity-100"
	} transition-opacity duration-200`;

	return (
		<div className={fieldClasses}>
			<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
				{getIcon(field.iconName)}
				{field.label}
			</label>

			{field.type === "select" ? (
				<SimpleSelect
					id={field.id}
					value={fieldValue as string}
					onChange={(e) => onFieldChange(field, e.target.value)}
					options={field.options || []}
					className={commonInputStyles}
				/>
			) : (
				<Input
					id={field.id}
					type={field.type}
					value={fieldValue as string | number}
					onChange={(e) =>
						onFieldChange(
							field,
							field.type === "number"
								? parseInt(e.target.value) || 0
								: e.target.value
						)
					}
					className={`${commonInputStyles} ${
						field.type === "number"
							? "number-input-noappearance"
							: ""
					}`}
					placeholder={field.placeholder}
					min={minValue}
					max={field.max}
					disabled={isDisabled}
				/>
			)}
		</div>
	);
};

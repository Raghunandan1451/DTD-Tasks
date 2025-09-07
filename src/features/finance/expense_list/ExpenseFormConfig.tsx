import { FieldConfig } from "@src/lib/types/form";

interface ExpenseFormData {
	name: string;
	amount: string;
	group: string;
	quantity: string;
	unit: string;
}

export const createExpenseFormFields = (
	groups: string[]
): FieldConfig<ExpenseFormData>[] => [
	{
		key: "name",
		type: "input",
		placeholder: "Name",
		width: "flex-[2]",
		className: "min-w-[150px]",
		validation: { required: true },
	},
	{
		key: "quantity",
		type: "number",
		placeholder: "Qty",
		width: "flex-[0.5]",
		className: "min-w-[70px]",
		inputProps: { min: "1" },
	},
	{
		key: "unit",
		type: "select",
		options: ["pc(s)", "kg", "lt", "g", "ml"],
		width: "flex-[1]",
		className: "min-w-[100px]",
	},
	{
		key: "amount",
		type: "number",
		placeholder: "Amount",
		width: "flex-[1]",
		className: "min-w-[100px]",
		validation: { required: true },
	},
	{
		key: "group",
		type: "select",
		options: groups,
		placeholder: "Group",
		width: "flex-[1]",
		className: "min-w-[120px]",
		validation: { required: true },
	},
];

export type { ExpenseFormData };

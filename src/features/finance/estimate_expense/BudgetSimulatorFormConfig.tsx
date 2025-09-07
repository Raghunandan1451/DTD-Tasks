import { FieldConfig } from "@src/lib/types/form";

interface BudgetSimulatorFormData {
	name: string;
	quantity: string;
	unit: string;
	amount: string;
}

export const createBudgetSimulatorFormFields =
	(): FieldConfig<BudgetSimulatorFormData>[] => [
		{
			key: "name",
			type: "input",
			placeholder: "Item name",
			width: "flex-[3]",
			className: "min-w-[150px]",
			validation: { required: true },
		},
		{
			key: "quantity",
			type: "number",
			placeholder: "Qty",
			width: "flex-[0.8]",
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
			inputProps: { step: "0.01" },
		},
	];

export type { BudgetSimulatorFormData };

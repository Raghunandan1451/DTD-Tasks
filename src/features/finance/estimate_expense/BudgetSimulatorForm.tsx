import React, { useState, useRef } from "react";
import GenericForm from "@src/components/shared/form/GenericForm";
import {
	createBudgetSimulatorFormFields,
	BudgetSimulatorFormData,
} from "@src/features/finance/estimate_expense/BudgetSimulatorFormConfig";
import { FormHandlers } from "@src/lib/types/form";
import { SimulatedExpense } from "@src/features/finance/type";

interface BudgetSimulatorFormProps {
	onAddItem: (item: SimulatedExpense) => void;
}

const BudgetSimulatorForm: React.FC<BudgetSimulatorFormProps> = ({
	onAddItem,
}) => {
	const nameInputRef = useRef<HTMLInputElement | null>(null);

	const [form, setForm] = useState<BudgetSimulatorFormData>({
		name: "",
		quantity: "",
		unit: "",
		amount: "",
	});

	const fields = createBudgetSimulatorFormFields();

	const handleChange = (
		field: keyof BudgetSimulatorFormData,
		value: string | number
	) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const container = e.currentTarget.closest("form");
			if (!container) return;

			const inputs = Array.from(
				container.querySelectorAll<HTMLElement>("input, select, button")
			).filter((el) => !el.hasAttribute("disabled"));

			const idx = inputs.indexOf(e.currentTarget as HTMLElement);

			if (e.shiftKey) {
				if (idx > 0) {
					inputs[idx - 1].focus();
				}
			} else {
				if (idx > -1 && idx < inputs.length - 1) {
					inputs[idx + 1].focus();
				}
			}
		}
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const { name, amount, quantity, unit } = form;
		if (!name || !amount) return;

		const newItem: SimulatedExpense = {
			id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			name,
			quantity: parseInt(quantity, 10),
			unit: unit,
			amount: parseFloat(amount),
		};

		onAddItem(newItem);

		setForm({
			name: "",
			quantity: "",
			unit: "",
			amount: "",
		});

		// Auto-focus the first field after successful submission
		setTimeout(() => {
			if (nameInputRef.current) {
				nameInputRef.current.focus();
			}
		}, 50);
	};

	const handlers: FormHandlers<BudgetSimulatorFormData> = {
		handleChange,
		handleKeyDown,
		handleSubmit,
	};

	return (
		<GenericForm
			fields={fields}
			formData={form}
			handlers={handlers}
			submitButton={{ text: "Add" }}
			firstFieldRef={(el) => (nameInputRef.current = el)}
			autoFocusFirst
		/>
	);
};

export default BudgetSimulatorForm;

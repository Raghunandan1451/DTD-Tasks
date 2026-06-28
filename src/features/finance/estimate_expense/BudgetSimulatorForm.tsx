import React, { useState } from "react";
import GenericForm from "@src/components/shared/form/GenericForm";
import {
	createBudgetSimulatorFormFields,
	BudgetSimulatorFormData,
} from "@src/features/finance/estimate_expense/BudgetSimulatorFormConfig";
import { FormHandlers } from "@src/lib/types/form";
import { SimulatedExpense } from "@src/features/finance/type";
import { useFormEnterNavigation } from "@src/lib/hooks/useFormEnterNavigation";
import { useResetAndRefocus } from "@src/lib/hooks/useResetAndRefocus";

interface BudgetSimulatorFormProps {
	onAddItem: (item: SimulatedExpense) => void;
}

const BLANK_FORM: BudgetSimulatorFormData = {
	name: "",
	quantity: "",
	unit: "",
	amount: "",
};

const BudgetSimulatorForm: React.FC<BudgetSimulatorFormProps> = ({
	onAddItem,
}) => {
	const [form, setForm] = useState<BudgetSimulatorFormData>(BLANK_FORM);
	const fields = createBudgetSimulatorFormFields();
	const handleKeyDown = useFormEnterNavigation();
	const { firstFieldRef, resetAndRefocus } = useResetAndRefocus(BLANK_FORM);

	const handleChange = (
		field: keyof BudgetSimulatorFormData,
		value: string | number,
	) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const { name, amount, quantity, unit } = form;
		if (!name || !amount) return;

		onAddItem({
			id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			name,
			quantity: parseInt(quantity, 10),
			unit,
			amount: parseFloat(amount),
		});

		resetAndRefocus(setForm);
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
			firstFieldRef={(el) => (firstFieldRef.current = el)}
			autoFocusFirst
		/>
	);
};

export default BudgetSimulatorForm;

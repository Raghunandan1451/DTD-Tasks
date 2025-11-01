import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@src/lib/store/store";
import { addExpenseToSelectedDate } from "@src/lib/store/slices/expensesSlice";
import GenericForm from "@src/components/shared/form/GenericForm";
import { createExpenseFormFields, ExpenseFormData } from "./ExpenseFormConfig";
import { FormHandlers } from "@src/lib/types/form";

const ExpenseEntryForm: React.FC = () => {
	const groups = useSelector((state: RootState) => state.finance.groups);
	const nameInputRef = useRef<HTMLInputElement | null>(null);
	const dispatch = useDispatch();

	const [form, setForm] = useState<ExpenseFormData>({
		name: "",
		amount: "",
		group: "",
		quantity: "",
		unit: "",
		type: "Dr",
	});

	const fields = createExpenseFormFields(groups);

	const handleChange = (
		field: keyof ExpenseFormData,
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
		const { name, amount, group, quantity, unit, type } = form;
		if (!name || !amount || !group) return;

		dispatch(
			addExpenseToSelectedDate({
				name,
				amount: parseFloat(amount),
				group,
				quantity: parseInt(quantity, 10),
				unit,
				type,
			})
		);

		setForm({
			name: "",
			amount: "",
			group: "",
			quantity: "",
			unit: "",
			type: "Dr",
		});

		// Auto-focus the first field after successful submission
		setTimeout(() => {
			if (nameInputRef.current) {
				nameInputRef.current.focus();
			}
		}, 50);
	};

	const handlers: FormHandlers<ExpenseFormData> = {
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

export default ExpenseEntryForm;

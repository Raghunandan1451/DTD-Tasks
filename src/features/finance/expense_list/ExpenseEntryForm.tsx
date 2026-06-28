import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@src/lib/store/store";
import { addExpenseToSelectedDate } from "@src/lib/store/slices/expensesSlice";
import GenericForm from "@src/components/shared/form/GenericForm";
import { createExpenseFormFields, ExpenseFormData } from "./ExpenseFormConfig";
import { FormHandlers } from "@src/lib/types/form";
import { useFormEnterNavigation } from "@src/lib/hooks/useFormEnterNavigation";
import { useResetAndRefocus } from "@src/lib/hooks/useResetAndRefocus";
import { filterSelectableGroups } from "@src/features/finance/lib/groupFilters";

const BLANK_FORM: ExpenseFormData = {
	name: "",
	amount: "",
	group: "",
	quantity: "",
	unit: "",
	type: "Dr",
};

const ExpenseEntryForm: React.FC = () => {
	// Filtered the same way selectExpenseGroups filters for the Edit
	// picker (excludes "Salary" and any blank/invalid entries), so both
	// pickers show the same list and help pick the correct group.
	const groups = useSelector((state: RootState) => state.finance.groups);
	const selectableGroups = useMemo(
		() => filterSelectableGroups(groups),
		[groups],
	);
	const dispatch = useDispatch();

	const [form, setForm] = useState<ExpenseFormData>(BLANK_FORM);
	const fields = createExpenseFormFields(selectableGroups);
	const handleKeyDown = useFormEnterNavigation();
	const { firstFieldRef, resetAndRefocus } = useResetAndRefocus(BLANK_FORM);

	const handleChange = (
		field: keyof ExpenseFormData,
		value: string | number,
	) => {
		setForm((prev) => ({ ...prev, [field]: value }));
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
			}),
		);

		resetAndRefocus(setForm);
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
			firstFieldRef={(el) => (firstFieldRef.current = el)}
			autoFocusFirst
		/>
	);
};

export default ExpenseEntryForm;

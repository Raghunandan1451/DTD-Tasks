import React, { useState, useRef } from "react";
import Input from "@src/components/ui/input/Input";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";
import Button from "@src/components/ui/button/Button";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@src/lib/store/store";
import { addExpenseToSelectedDate } from "@src/lib/store/slices/expensesSlice";

const ExpenseEntryForm: React.FC = () => {
	const groups = useSelector((state: RootState) => state.finance.groups);
	const formRef = useRef<HTMLFormElement | null>(null);
	const nameInputRef = useRef<HTMLInputElement | null>(null);
	const dispatch = useDispatch();
	const [form, setForm] = useState({
		name: "",
		amount: "",
		group: "",
		quantity: "",
		unit: "",
	});

	const handleChange = (field: string, value: string | number) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const container = formRef.current;
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

	const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const { name, amount, group, quantity, unit } = form;
		if (!name || !amount || !group) return;

		dispatch(
			addExpenseToSelectedDate({
				name,
				amount: parseFloat(amount),
				group,
				quantity: parseInt(quantity, 10),
				unit,
			})
		);

		setForm({
			name: "",
			amount: "",
			group: "",
			quantity: "",
			unit: "",
		});

		// Auto-focus the first field after successful submission
		setTimeout(() => {
			if (nameInputRef.current) {
				nameInputRef.current.focus();
			}
		}, 50);
	};

	return (
		<form
			ref={formRef}
			onSubmit={handleAdd}
			className="flex flex-wrap gap-2 items-end mb-4"
		>
			<Input
				inputRef={(el) => (nameInputRef.current = el)}
				id="name"
				value={form.name}
				onChange={(e) => handleChange("name", e.target.value)}
				placeholder="Name"
				className="flex-[2] min-w-[150px] w-full backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-lg shadow-lg focus:bg-white/30 dark:focus:bg-white/15 focus:border-white/50 dark:focus:border-white/30 transition-all duration-300 placeholder:text-gray-700 dark:placeholder:text-gray-300 text-gray-800 dark:text-gray-200"
				onKeyDown={handleKeyDown}
				autoFocus
			/>

			<Input
				id="quantity"
				type="number"
				value={form.quantity}
				onChange={(e) => handleChange("quantity", e.target.value)}
				min="1"
				placeholder="Qty"
				className="flex-[0.5] min-w-[70px] w-full backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-lg shadow-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:bg-white/30 dark:focus:bg-white/15 focus:border-white/50 dark:focus:border-white/30 transition-all duration-300 placeholder:text-gray-700 dark:placeholder:text-gray-300 text-gray-800 dark:text-gray-200"
				onKeyDown={handleKeyDown}
			/>

			<SimpleSelect
				id="unit"
				value={form.unit}
				onChange={(e) => handleChange("unit", e.target.value)}
				options={[
					"pc(s)",
					"kg",
					"lt",
					"g",
					"ml",
					"package of 4",
					"package of 8",
					"package of 12",
					"package of 24",
				]}
				className="flex-[1] min-w-[100px] w-full backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-lg shadow-lg focus:bg-white/30 dark:focus:bg-white/15 focus:border-white/50 dark:focus:border-white/30 transition-all duration-300 text-gray-800 dark:text-gray-200"
				onKeyDown={handleKeyDown}
			/>

			<Input
				id="amount"
				type="number"
				value={form.amount}
				onChange={(e) => handleChange("amount", e.target.value)}
				placeholder="Amount"
				className="flex-[1] min-w-[100px] w-full backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-lg shadow-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:bg-white/30 dark:focus:bg-white/15 focus:border-white/50 dark:focus:border-white/30 transition-all duration-300 placeholder:text-gray-700 dark:placeholder:text-gray-300 text-gray-800 dark:text-gray-200"
				onKeyDown={handleKeyDown}
			/>

			<SimpleSelect
				id="group"
				value={form.group}
				onChange={(e) => handleChange("group", e.target.value)}
				options={groups}
				placeholder="Group"
				className="flex-[1] min-w-[120px] w-full backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-lg shadow-lg focus:bg-white/30 dark:focus:bg-white/15 focus:border-white/50 dark:focus:border-white/30 transition-all duration-300 text-gray-800 dark:text-gray-200"
				onKeyDown={handleKeyDown}
			/>

			<Button
				type="submit"
				className="flex-[0.7] min-w-[80px] w-full backdrop-blur-md bg-blue-500/80 dark:bg-blue-600/70 hover:bg-blue-600/90 dark:hover:bg-blue-500/80 border border-blue-400/50 dark:border-blue-500/50 text-white rounded-lg px-2 py-1 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
				text="Add"
			/>
		</form>
	);
};

export default ExpenseEntryForm;

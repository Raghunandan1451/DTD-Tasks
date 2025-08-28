// src/features/finance/expense_list/ExpenseTable.tsx
import { FC, useState, useRef, useEffect } from "react";
import { ExpenseEntry } from "@src/lib/types/finance";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, Check, X } from "lucide-react";
import Input from "@src/components/ui/input/Input";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";

interface ExpenseTableProps {
	expenses: ExpenseEntry[];
	groups: string[];
	onEdit: (expense: ExpenseEntry) => void;
	onDelete: (id: string) => void;
}

const ExpenseTable: FC<ExpenseTableProps> = ({
	expenses,
	groups,
	onEdit,
	onDelete,
}) => {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<ExpenseEntry | null>(null);
	const editRowRef = useRef<HTMLTableRowElement | null>(null);

	const handleStartEdit = (expense: ExpenseEntry) => {
		setEditingId(expense.id);
		setEditForm({ ...expense });
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditForm(null);
	};

	const handleSaveEdit = () => {
		if (editForm) {
			onEdit(editForm);
			setEditingId(null);
			setEditForm(null);
		}
	};

	const handleEditChange = (
		field: keyof ExpenseEntry,
		value: string | number
	) => {
		if (editForm) {
			setEditForm({
				...editForm,
				[field]:
					field === "amount"
						? parseFloat(value as string) || 0
						: field === "quantity"
						? parseInt(value as string, 10) || 0
						: value,
			});
		}
	};

	const handleDelete = (id: string, name: string) => {
		if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
			onDelete(id);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();

			// Navigate to next input in edit mode
			const editRow = editRowRef.current;
			if (editRow) {
				const inputs = Array.from(
					editRow.querySelectorAll<HTMLElement>("input, select")
				).filter((el) => !el.hasAttribute("disabled"));

				const currentIndex = inputs.indexOf(
					e.currentTarget as HTMLElement
				);

				if (currentIndex < inputs.length - 1) {
					inputs[currentIndex + 1].focus();
				} else {
					// If on last input, save the edit
					handleSaveEdit();
				}
			}
		}
		if (e.key === "Escape") {
			handleCancelEdit();
		}
	};

	// Auto-focus first input when entering edit mode
	useEffect(() => {
		if (editingId && editRowRef.current) {
			const firstInput =
				editRowRef.current.querySelector<HTMLInputElement>("input");
			if (firstInput) {
				setTimeout(() => firstInput.focus(), 50);
			}
		}
	}, [editingId]);

	const displayQuantity = (quantity: number, unit: string) => {
		if (isNaN(quantity) || !quantity || !unit) {
			return "-";
		}
		return `${quantity} ${unit}`;
	};

	return (
		<div className="overflow-x-auto backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl shadow-xl">
			<table className="min-w-full text-sm">
				<thead>
					<tr className="backdrop-blur-md bg-white/20 dark:bg-white/10 border-b border-white/30 dark:border-white/20">
						<th className="text-left px-2 py-1 w-[35%] text-gray-800 dark:text-gray-200 font-semibold">
							Name
						</th>
						<th className="text-left px-2 py-1 w-[10%] text-gray-800 dark:text-gray-200 font-semibold">
							Quantity
						</th>
						<th className="text-left px-2 py-1 w-[13%] text-gray-800 dark:text-gray-200 font-semibold">
							Amount
						</th>
						<th className="text-left px-2 py-1 w-[13%] text-gray-800 dark:text-gray-200 font-semibold">
							Group
						</th>
						<th className="text-left px-2 py-1 w-[10%] text-gray-800 dark:text-gray-200 font-semibold">
							Date
						</th>
						<th className="text-left px-2 py-1 w-[7%] text-gray-800 dark:text-gray-200 font-semibold">
							Type
						</th>
						<th className="text-left px-2 py-1 w-[12%] text-gray-800 dark:text-gray-200 font-semibold">
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{expenses.length === 0 ? (
						<tr>
							<td
								colSpan={7}
								className="px-2 py-8 text-center text-gray-600 dark:text-gray-400"
							>
								No expenses found for this day
							</td>
						</tr>
					) : (
						expenses.map((expense) => (
							<tr
								key={expense.id}
								ref={
									editingId === expense.id ? editRowRef : null
								}
								className={`border-b border-white/20 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300 ${
									editingId === expense.id
										? "bg-blue-500/20 dark:bg-blue-500/15 backdrop-blur-md"
										: ""
								}`}
							>
								{/* Name - 35% width */}
								<td className="px-2 py-1 w-[35%]">
									{editingId === expense.id ? (
										<Input
											id="name-edit"
											value={editForm?.name || ""}
											onChange={(e) =>
												handleEditChange(
													"name",
													e.target.value
												)
											}
											className="w-full text-sm backdrop-blur-md bg-white/30 dark:bg-white/20 border border-white/40 dark:border-white/30 rounded-md shadow-md focus:bg-white/40 dark:focus:bg-white/25 focus:border-white/60 dark:focus:border-white/40 transition-all duration-300 text-gray-800 dark:text-gray-200"
											onKeyDown={handleKeyDown}
											placeholder="Expense name"
										/>
									) : (
										<div
											className="truncate text-gray-800 dark:text-gray-200"
											title={expense.name}
										>
											{expense.name}
										</div>
									)}
								</td>

								{/* Quantity - 10% width */}
								<td className="px-2 py-1 w-[10%]">
									{editingId === expense.id ? (
										<div className="flex gap-1">
											<Input
												id="quantity-edit"
												type="number"
												value={editForm?.quantity || ""}
												onChange={(e) =>
													handleEditChange(
														"quantity",
														e.target.value
													)
												}
												className="w-12 text-sm backdrop-blur-md bg-white/30 dark:bg-white/20 border border-white/40 dark:border-white/30 rounded-md shadow-md focus:bg-white/40 dark:focus:bg-white/25 focus:border-white/60 dark:focus:border-white/40 transition-all duration-300 text-gray-800 dark:text-gray-200"
												min="0"
												onKeyDown={handleKeyDown}
												placeholder="0"
											/>
											<SimpleSelect
												id="unit-edit"
												value={editForm?.unit || ""}
												onChange={(e) =>
													handleEditChange(
														"unit",
														e.target.value
													)
												}
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
												className="text-xs backdrop-blur-md bg-white/30 dark:bg-white/20 border border-white/40 dark:border-white/30 rounded-md shadow-md focus:bg-white/40 dark:focus:bg-white/25 focus:border-white/60 dark:focus:border-white/40 transition-all duration-300 text-gray-800 dark:text-gray-200"
												onKeyDown={handleKeyDown}
											/>
										</div>
									) : (
										<div
											className="truncate text-gray-800 dark:text-gray-200"
											title={displayQuantity(
												expense.quantity,
												expense.unit
											)}
										>
											{displayQuantity(
												expense.quantity,
												expense.unit
											)}
										</div>
									)}
								</td>

								{/* Amount - 13% width */}
								<td className="px-2 py-1 w-[13%]">
									{editingId === expense.id ? (
										<Input
											id="amount-edit"
											type="number"
											value={editForm?.amount || ""}
											onChange={(e) =>
												handleEditChange(
													"amount",
													e.target.value
												)
											}
											className="w-full text-sm backdrop-blur-md bg-white/30 dark:bg-white/20 border border-white/40 dark:border-white/30 rounded-md shadow-md focus:bg-white/40 dark:focus:bg-white/25 focus:border-white/60 dark:focus:border-white/40 transition-all duration-300 text-gray-800 dark:text-gray-200"
											step="0.01"
											onKeyDown={handleKeyDown}
											placeholder="0.00"
										/>
									) : (
										<div className="font-medium text-gray-800 dark:text-gray-200">
											₹{expense.amount.toFixed(2)}
										</div>
									)}
								</td>

								{/* Group - 13% width */}
								<td className="px-2 py-1 w-[13%]">
									{editingId === expense.id ? (
										<SimpleSelect
											id="group-edit"
											value={editForm?.group || ""}
											onChange={(e) =>
												handleEditChange(
													"group",
													e.target.value
												)
											}
											options={groups}
											className="text-sm backdrop-blur-md bg-white/30 dark:bg-white/20 border border-white/40 dark:border-white/30 rounded-md shadow-md focus:bg-white/40 dark:focus:bg-white/25 focus:border-white/60 dark:focus:border-white/40 transition-all duration-300 text-gray-800 dark:text-gray-200"
											onKeyDown={handleKeyDown}
										/>
									) : (
										<div
											className="truncate text-gray-800 dark:text-gray-200"
											title={expense.group}
										>
											{expense.group}
										</div>
									)}
								</td>

								{/* Date - 10% width */}
								<td className="px-2 py-1 w-[10%]">
									{editingId === expense.id ? (
										<Input
											id="date-edit"
											type="date"
											value={editForm?.date || ""}
											onChange={(e) =>
												handleEditChange(
													"date",
													e.target.value
												)
											}
											className="w-full text-sm backdrop-blur-md bg-white/30 dark:bg-white/20 border border-white/40 dark:border-white/30 rounded-md shadow-md focus:bg-white/40 dark:focus:bg-white/25 focus:border-white/60 dark:focus:border-white/40 transition-all duration-300 text-gray-800 dark:text-gray-200"
											onKeyDown={handleKeyDown}
										/>
									) : (
										<div className="text-xs text-gray-700 dark:text-gray-300">
											{format(
												parseISO(expense.date),
												"dd MMM yyyy"
											)}
										</div>
									)}
								</td>

								{/* Type (Debit/Credit) - 7% width */}
								<td className="px-2 py-1 w-[7%]">
									<div
										className={`text-xs font-semibold text-center px-2 py-1 rounded-full backdrop-blur-md ${
											expense.type === "Dr" ||
											!expense.type
												? "bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30"
												: "bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30"
										} transition-all duration-300`}
									>
										{expense.type || "Dr"}
									</div>
								</td>

								{/* Actions - 12% width */}
								<td className="px-2 py-1 w-[12%]">
									<div className="flex items-center justify-center gap-1">
										{editingId === expense.id ? (
											<>
												<button
													className="backdrop-blur-md bg-green-500/70 hover:bg-green-600/80 border border-green-400/50 text-white p-1 rounded-md shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
													onClick={handleSaveEdit}
													title="Save changes"
													type="button"
												>
													<Check size={14} />
												</button>
												<button
													className="backdrop-blur-md bg-gray-500/70 hover:bg-gray-600/80 border border-gray-400/50 text-white p-1 rounded-md shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
													onClick={handleCancelEdit}
													title="Cancel edit"
													type="button"
												>
													<X size={14} />
												</button>
											</>
										) : (
											<>
												<button
													className="backdrop-blur-md bg-blue-500/70 hover:bg-blue-600/80 border border-blue-400/50 text-white p-1 rounded-md shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
													onClick={() =>
														handleStartEdit(expense)
													}
													title="Edit expense"
													type="button"
												>
													<Pencil size={14} />
												</button>
												<button
													className="backdrop-blur-md bg-red-500/70 hover:bg-red-600/80 border border-red-400/50 text-white p-1 rounded-md shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
													onClick={() =>
														handleDelete(
															expense.id,
															expense.name
														)
													}
													title="Delete expense"
													type="button"
												>
													<Trash2 size={14} />
												</button>
											</>
										)}
									</div>
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};

export default ExpenseTable;

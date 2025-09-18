import { FC } from "react";
import { ExpenseEntry } from "@src/features/finance/type";
import useExpenseTable from "@src/lib/hooks/useExpenseTable";
import GenericTable from "@src/components/shared/table/GenericTable";
import { createExpenseColumns } from "@src/features/finance/expense_list/ExpenseTableConfig";
import { TableHandlers } from "@src/lib/types/table";
import { ConfirmationModal } from "@src/components/shared/dialog/ConfirmModal";

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
	const { editingId, editForm, editRowRef, handlers, confirmationModal } =
		useExpenseTable({
			onEdit,
			onDelete,
		});

	const columns = createExpenseColumns(groups);

	// Convert ExpenseTableHandlers to TableHandlers<ExpenseEntry>
	const adaptedHandlers: TableHandlers<ExpenseEntry> = {
		...(handlers as unknown as TableHandlers<ExpenseEntry>),
		handleDelete: (id: string, name: string, isProtected?: boolean) =>
			handlers.handleDelete(id, name, isProtected || false),
	};

	const sortExpenses = (expenses: ExpenseEntry[]): ExpenseEntry[] => {
		return [...expenses].sort((a, b) => {
			if (a.type === "Cr" && b.type !== "Cr") return -1;
			if (a.type !== "Cr" && b.type === "Cr") return 1;
			return 0;
		});
	};

	const getRowClassName = (
		expense: ExpenseEntry,
		isEditing: boolean
	): string => {
		if (isEditing) {
			return "bg-blue-500/20 dark:bg-blue-500/15 backdrop-blur-md";
		}
		if (expense.type === "Cr") {
			return "bg-green-500/10 dark:bg-green-500/5";
		}
		return "";
	};

	return (
		<>
			<GenericTable
				data={expenses}
				columns={columns}
				editingId={editingId}
				editForm={editForm}
				editRowRef={editRowRef}
				handlers={adaptedHandlers}
				getRowId={(expense) => expense.id}
				getRowClassName={getRowClassName}
				sortData={sortExpenses}
				emptyMessage="No expenses found for this day"
			/>
			<ConfirmationModal
				isOpen={confirmationModal.isOpen}
				options={confirmationModal.options}
				onConfirm={confirmationModal.handleConfirm}
				onCancel={confirmationModal.handleCancel}
			/>
		</>
	);
};

export default ExpenseTable;

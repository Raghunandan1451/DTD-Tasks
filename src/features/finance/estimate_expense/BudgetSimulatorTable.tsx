import { FC } from "react";
import { SimulatedExpense } from "@src/features/finance/type";
import GenericTable from "@src/components/shared/table/GenericTable";
import { createBudgetSimulatorColumns } from "@src/features/finance/estimate_expense/BudgetSimulatorTableConfig";
import { TableHandlers } from "@src/lib/types/table";

interface BudgetSimulatorTableProps {
	simulatedExpenses: SimulatedExpense[];
	onRemoveItem: (id: string) => void;
}

const BudgetSimulatorTable: FC<BudgetSimulatorTableProps> = ({
	simulatedExpenses,
	onRemoveItem,
}) => {
	const columns = createBudgetSimulatorColumns();

	const handlers: TableHandlers<SimulatedExpense> = {
		handleEditChange: () => {},
		handleKeyDown: () => {},
		handleSaveEdit: () => {},
		handleCancelEdit: () => {},
		handleStartEdit: () => {},
		handleDelete: (id: string) => onRemoveItem(id),
	};

	const getRowClassName = (): string => {
		return "bg-orange-500/5 dark:bg-orange-500/5";
	};

	return (
		<GenericTable
			data={simulatedExpenses}
			columns={columns}
			editingId={null}
			editForm={null}
			handlers={handlers}
			getRowId={(item) => item.id}
			getRowClassName={getRowClassName}
			emptyMessage="No items in simulation"
		/>
	);
};

export default BudgetSimulatorTable;

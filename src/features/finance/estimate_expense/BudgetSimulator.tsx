import React, { useMemo, useState } from "react";
import { SimulatedExpense } from "@src/features/finance/type";
import BudgetSimulatorForm from "@src/features/finance/estimate_expense/BudgetSimulatorForm";
import BudgetSimulatorTable from "@src/features/finance/estimate_expense/BudgetSimulatorTable";
import PaginationControls from "@src/features/finance/estimate_expense/PaginationControls";
import useExpenseTable from "@src/lib/hooks/useExpenseTable";
import { ConfirmationModal } from "@src/components/shared/dialog/ConfirmModal";

interface BudgetSimulatorProps {
	setSimulatedExpenses: React.Dispatch<
		React.SetStateAction<SimulatedExpense[]>
	>;
	simulatedExpenses?: SimulatedExpense[];
}

const BudgetSimulator: React.FC<BudgetSimulatorProps> = ({
	setSimulatedExpenses,
	simulatedExpenses = [],
}) => {
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const { handlers, confirmationModal } = useExpenseTable({
		onEdit: () => {},
		onDelete: (id: string) => {
			setSimulatedExpenses((prev) =>
				prev.filter((item) => item.id !== id)
			);
		},
	});
	const { paginatedExpenses, totalPages } = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;

		return {
			paginatedExpenses: simulatedExpenses.slice(startIndex, endIndex),
			totalPages: Math.ceil(simulatedExpenses.length / itemsPerPage),
		};
	}, [simulatedExpenses, currentPage]);

	React.useEffect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			setCurrentPage(1);
		}
	}, [totalPages, currentPage]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handleAddItem = (item: SimulatedExpense) => {
		setSimulatedExpenses((prev) => [...prev, item]);
	};

	const handleRemoveItem = (id: string) => {
		const item = simulatedExpenses.find((exp) => exp.id === id);
		handlers.handleRemoveItem(id, item?.name);
	};

	return (
		<>
			<BudgetSimulatorForm onAddItem={handleAddItem} />
			{simulatedExpenses.length > 0 && (
				<PaginationControls
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={simulatedExpenses.length}
					itemsPerPage={itemsPerPage}
					onPageChange={handlePageChange}
				/>
			)}
			{/* Simulated Items Table */}
			<BudgetSimulatorTable
				simulatedExpenses={paginatedExpenses}
				onRemoveItem={handleRemoveItem}
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

export default BudgetSimulator;

import { useState } from "react";
import {
	handleFinanceExport,
	type FinanceExportReportScope,
} from "@src/lib/utils/downloadHandler";
import type {
	FinanceState,
	SimulatedExpense,
} from "@src/features/finance/type";
import type { ExpensesData } from "@src/lib/types/downloadHandlerTypes";
import type { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";

/**
 * Manages the download-options modal's open state and the export
 * action itself. Extracted from ExpenseTracker.tsx to keep the
 * container focused on composing child components rather than
 * orchestrating the export flow inline.
 */
export const useFinanceExport = (
	finance: FinanceState,
	expensesState: ExpensesData,
	simulatedExpenses: SimulatedExpense[],
	totalSimulatedCost: number,
	showNotification: ShowNotificationFn,
) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	const open = () => setIsOpen(true);
	const cancel = () => setIsOpen(false);

	const selectScope = async (reportScope: FinanceExportReportScope) => {
		setIsExporting(true);
		try {
			await handleFinanceExport(
				finance,
				expensesState,
				simulatedExpenses,
				totalSimulatedCost,
				showNotification,
				reportScope,
			);
			setIsOpen(false);
		} finally {
			setIsExporting(false);
		}
	};

	return { isOpen, isExporting, open, cancel, selectScope };
};

import { useSelector } from "react-redux";
import { RootState } from "@src/lib/store/store";
import { useEffect, useState } from "react";
import ExpenseSummary from "@src/features/finance/ExpenseSummary";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { ExpenseSections } from "@src/features/finance/ExpenseSections";
import { ViewMode, SimulatedExpense } from "@src/features/finance/type";
import {
	selectExpensesForSelectedDate,
	selectCalculatedBalance,
	selectTotalAllExpenses,
} from "@src/lib/store/selectors/expenseSelectors";
import { handleFinanceExport } from "@src/lib/utils/downloadHandler";
import useNotifications from "@src/lib/hooks/useNotifications";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import type { FinanceExportReportScope } from "@src/lib/utils/downloadHandler";
import { useFinanceHydration } from "@src/features/finance/hooks/useFinanceHydration";
import { useFinanceUploadHandler } from "@src/features/finance/hooks/useFinanceUploadHandler";
import DownloadOptionsModal from "@src/features/finance/components/DownloadOptionsModal";

const ExpenseTracker = () => {
	const { notifications, showNotification } = useNotifications();

	const finance = useSelector((state: RootState) => state.finance);
	const expensesState = useSelector((state: RootState) => state.expenses);
	const expenses = expensesState.expenses;
	const expensesLoaded = expensesState.loaded;

	const selectedDateExpenses = useSelector(selectExpensesForSelectedDate);
	const calculatedBalance = useSelector(selectCalculatedBalance);
	const totalAllExpenses = useSelector(selectTotalAllExpenses);

	const { salary, currentBalance, loaded } = finance;

	const [viewMode, setViewMode] = useState<ViewMode>("salary");
	const [simulatedExpenses, setSimulatedExpenses] = useState<
		SimulatedExpense[]
	>([]);
	const [showDownloadOptions, setShowDownloadOptions] = useState(false);
	const [isExportingReports, setIsExportingReports] = useState(false);

	const totalSimulatedCost = simulatedExpenses.reduce(
		(sum, item) => sum + item.amount,
		0,
	);
	const projectedBalance = calculatedBalance - totalSimulatedCost;

	useFinanceHydration(finance, expenses, expensesLoaded);
	const handleUpload = useFinanceUploadHandler(showNotification);

	useEffect(() => {
		if (loaded && salary && currentBalance) {
			setViewMode("list");
		}
	}, [loaded, salary, currentBalance]);

	const handleDownloadSelection = async (
		reportScope: FinanceExportReportScope,
	) => {
		setIsExportingReports(true);
		try {
			await handleFinanceExport(
				finance,
				expensesState,
				simulatedExpenses,
				totalSimulatedCost,
				showNotification,
				reportScope,
			);
			setShowDownloadOptions(false);
		} finally {
			setIsExportingReports(false);
		}
	};

	return (
		<>
			<TitleWithButton
				heading="Expense Tracker"
				buttonText="Download"
				onDownload={() => setShowDownloadOptions(true)}
				onUpload={handleUpload}
				showUpload={true}
				showNotification={showNotification}
			/>
			<ExpenseSummary
				balance={calculatedBalance}
				expenses={totalAllExpenses}
				simulatedRemaining={projectedBalance}
				viewMode={viewMode}
				onChangeView={setViewMode}
			/>
			<ExpenseSections
				viewMode={viewMode}
				allExpenses={expenses}
				datedExpenses={selectedDateExpenses}
				setSimulatedExpenses={setSimulatedExpenses}
				simulatedExpenses={simulatedExpenses}
				currentBalance={currentBalance}
				showNotification={showNotification}
			/>
			{showDownloadOptions && (
				<DownloadOptionsModal
					isExporting={isExportingReports}
					onSelect={handleDownloadSelection}
					onCancel={() => setShowDownloadOptions(false)}
				/>
			)}
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default ExpenseTracker;

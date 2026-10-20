import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { useEffect, useState } from "react";
import ExpenseSummary from "@src/features/finance/ExpenseSummary";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { ExpenseSections } from "@src/features/finance/ExpenseSections";
import { ViewMode } from "@src/features/finance/type";
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
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";
import { setBudgetPlanForMonth } from "@src/lib/store/slices/financeSlice";

const ExpenseTracker = () => {
	const dispatch = useDispatch<AppDispatch>();
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
	const budgetCategories =
		finance.budgetCategories ?? DEFAULT_BUDGET_CATEGORIES;
	const [showDownloadOptions, setShowDownloadOptions] = useState(false);
	const [isExportingReports, setIsExportingReports] = useState(false);

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
				undefined,
				undefined,
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
				viewMode={viewMode}
				onChangeView={setViewMode}
			/>
			<ExpenseSections
				viewMode={viewMode}
				allExpenses={expenses}
				datedExpenses={selectedDateExpenses}
				budgetCategories={budgetCategories}
				budgetPlansByMonth={finance.budgetPlansByMonth}
				onBudgetPlanChange={(month, categories) =>
					dispatch(setBudgetPlanForMonth({ month, categories }))
				}
				currentBalance={currentBalance}
				monthlyIncome={finance.salary?.amount ?? 0}
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

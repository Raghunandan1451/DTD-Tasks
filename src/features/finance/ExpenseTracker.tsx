import { useDispatch, useSelector, useStore } from "react-redux";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { useEffect, useState } from "react";
import ExpenseSummary from "@src/features/finance/ExpenseSummary";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { ExpenseSections } from "@src/features/finance/ExpenseSections";
import { ViewMode } from "@src/features/finance/type";
import {
	selectExpenses,
	selectExpensesLoaded,
	selectCalculatedBalance,
	selectTotalAllExpenses,
} from "@src/lib/store/selectors/expenseSelectors";
import {
	selectBudgetCategories,
	selectBudgetPlansByMonth,
	selectCurrentBalance,
	selectFinance,
	selectFinanceLoaded,
	selectSalary,
	selectSalaryHistory,
} from "@src/lib/store/selectors/financeSelectors";
import { handleFinanceExport } from "@src/lib/utils/downloadHandler";
import useNotifications from "@src/lib/hooks/useNotifications";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import type { FinanceExportReportScope } from "@src/lib/utils/downloadHandler";
import { useFinanceHydration } from "@src/features/finance/hooks/useFinanceHydration";
import { useSavingsSnapshots } from "@src/features/finance/budget_planning/hooks/useSavingsSnapshots";
import { useFinanceUploadHandler } from "@src/features/finance/hooks/useFinanceUploadHandler";
import DownloadOptionsModal from "@src/features/finance/components/DownloadOptionsModal";
import { setBudgetPlanForMonth } from "@src/lib/store/slices/financeSlice";

const ExpenseTracker = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { notifications, showNotification } = useNotifications();

	const store = useStore<RootState>();

	// useSavingsSnapshots reconciles against most of the finance slice
	const finance = useSelector(selectFinance);
	const expenses = useSelector(selectExpenses);
	const expensesLoaded = useSelector(selectExpensesLoaded);
	const loaded = useSelector(selectFinanceLoaded);
	const salary = useSelector(selectSalary);
	const salaryHistory = useSelector(selectSalaryHistory);
	const currentBalance = useSelector(selectCurrentBalance);
	const budgetCategories = useSelector(selectBudgetCategories);
	const budgetPlansByMonth = useSelector(selectBudgetPlansByMonth);

	const calculatedBalance = useSelector(selectCalculatedBalance);
	const totalAllExpenses = useSelector(selectTotalAllExpenses);

	const [viewMode, setViewMode] = useState<ViewMode>("salary");
	const [showDownloadOptions, setShowDownloadOptions] = useState(false);
	const [isExportingReports, setIsExportingReports] = useState(false);

	useFinanceHydration();
	useSavingsSnapshots({ finance, expenses, expensesLoaded });
	const handleUpload = useFinanceUploadHandler();

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
				store.getState().expenses,
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
				onUploadFiles={handleUpload}
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
				budgetCategories={budgetCategories}
				budgetPlansByMonth={budgetPlansByMonth}
				onBudgetPlanChange={(month, categories) =>
					dispatch(setBudgetPlanForMonth({ month, categories }))
				}
				currentBalance={currentBalance}
				monthlyIncome={salary?.amount ?? 0}
				salaryHistory={salaryHistory}
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

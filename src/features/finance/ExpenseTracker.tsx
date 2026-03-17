import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { useEffect, useState } from "react";
import ExpenseSummary from "@src/features/finance/ExpenseSummary";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { ExpenseSections } from "@src/features/finance/ExpenseSections";
import { ViewMode, SimulatedExpense } from "@src/features/finance/type";
import { hydrateFinance } from "@src/lib/store/thunks/financeThunk";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import {
	selectExpensesForSelectedDate,
	selectCalculatedBalance,
	selectTotalAllExpenses,
} from "@src/lib/store/selectors/expenseSelectors";
import { addSalaryForMissedMonths } from "@src/lib/utils/finance";
import {
	handleFinanceExport,
	handleJSONUpload,
} from "@src/lib/utils/downloadHandler";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";
import { setExpenses } from "@src/lib/store/slices/expensesSlice";
import useNotifications from "@src/lib/hooks/useNotifications";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import type { FinanceState } from "@src/features/finance/type";
import type { ExpensesData } from "@src/lib/types/downloadHandlerTypes";

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
	const [simulatedExpenses, setSimulatedExpenses] = useState<
		SimulatedExpense[]
	>([]);

	const totalSimulatedCost = simulatedExpenses.reduce(
		(sum, item) => sum + item.amount,
		0
	);
	const projectedBalance = calculatedBalance - totalSimulatedCost;

	useEffect(() => {
		if (!loaded) {
			dispatch(hydrateFinance());
		}
		if (!expensesLoaded) {
			dispatch(hydrateExpenses());
		}
	}, [dispatch, loaded, expensesLoaded]);

	useEffect(() => {
		if (loaded && expensesLoaded && salary) {
			addSalaryForMissedMonths(salary, expenses, dispatch, finance, 6);
		}
	}, [loaded, expensesLoaded, salary, expenses, dispatch, finance]);

	useEffect(() => {
		if (loaded && salary && currentBalance) {
			setViewMode("list");
		}
	}, [loaded, salary, currentBalance]);

	const handleDownload = () => {
		return handleFinanceExport(
			finance,
			expensesState,
			simulatedExpenses,
			totalSimulatedCost,
			showNotification
		);
	};

	const handleUpload = async (file: File) => {
		const fileName = file.name.toLowerCase();

		if (fileName.includes("finance")) {
			return handleJSONUpload<FinanceState>(
				file,
				(data) => {
					dispatch(setFinanceState(data));
					showNotification(
						"Finance data restored successfully",
						"success"
					);
				},
				(error) => showNotification(error, "error"),
				showNotification
			);
		} else if (fileName.includes("expense")) {
			return handleJSONUpload<ExpensesData>(
				file,
				(data) => {
					dispatch(setExpenses(data.expenses));
					showNotification(
						"Expenses data restored successfully",
						"success"
					);
				},
				(error) => showNotification(error, "error"),
				showNotification
			);
		} else {
			showNotification(
				"Please select a finance or expense JSON file",
				"error"
			);
		}
	};

	return (
		<>
			<TitleWithButton
				heading="Expense Tracker"
				buttonText="Download"
				onDownload={handleDownload}
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
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default ExpenseTracker;

// Updated ExpenseTracker.tsx
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { useEffect, useState } from "react";
import ExpenseSummary from "@src/features/finance/ExpenseSummary";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { ExpenseSections } from "@src/features/finance/ExpenseSections";
import { ViewMode } from "@src/lib/types/finance";
import { hydrateFinance } from "@src/lib/store/thunks/financeThunk";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import {
	// selectSelectedDateTotal,
	selectExpensesForSelectedDate,
	selectCalculatedBalance,
	// selectSelectedDateCredits,
	selectTotalAllExpenses, // Add this import
} from "@src/lib/store/selectors/expenseSelectors";
import { addSalaryForMissedMonths } from "@src/lib/utils/finance";

const ExpenseTracker = () => {
	const finance = useSelector((state: RootState) => state.finance);
	const expenses = useSelector((state: RootState) => state.expenses.expenses);
	const expensesLoaded = useSelector(
		(state: RootState) => state.expenses.loaded
	);

	// Using selectors for data
	const selectedDateExpenses = useSelector(selectExpensesForSelectedDate);
	const calculatedBalance = useSelector(selectCalculatedBalance);
	const totalAllExpenses = useSelector(selectTotalAllExpenses); // Use the selector

	const { salary, currentBalance, loaded } = finance;
	const dispatch = useDispatch<AppDispatch>();

	const [viewMode, setViewMode] = useState<ViewMode>("salary");

	// For simulation: remaining - additional logged expenses
	const additionalExpenses = 0;
	const simulatedRemaining = calculatedBalance - additionalExpenses;

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
			const addedCount = addSalaryForMissedMonths(
				salary,
				expenses,
				dispatch,
				finance,
				6
			);

			if (addedCount && addedCount > 0) {
				console.log(
					`Auto-generated ${addedCount} missing salary entries`
				);
			}
		}
	}, [loaded, expensesLoaded, salary, expenses, dispatch, finance]);

	useEffect(() => {
		if (loaded && salary && currentBalance) {
			setViewMode("list");
		}
	}, [loaded, salary, currentBalance]);

	return (
		<>
			<TitleWithButton
				heading="Expense Tracker"
				buttonText="Export as PDF"
				onDownload={() => console.log("Exporting PDF...")}
			/>
			<ExpenseSummary
				balance={calculatedBalance}
				expenses={totalAllExpenses}
				remaining={calculatedBalance}
				simulatedRemaining={simulatedRemaining}
				viewMode={viewMode}
				onChangeView={setViewMode}
			/>
			<ExpenseSections
				viewMode={viewMode}
				allExpenses={selectedDateExpenses}
			/>
		</>
	);
};

export default ExpenseTracker;

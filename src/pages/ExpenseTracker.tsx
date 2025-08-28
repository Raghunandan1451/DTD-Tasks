import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { useEffect, useState } from "react";
import ExpenseSummary from "@src/features/finance/ExpenseSummary";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { ExpenseSections } from "@src/features/finance/ExpenseSections";
import { ViewMode } from "@src/lib/types/finance";
import { hydrateFinance } from "@src/lib/store/thunks/financeThunk";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import { autoUpdateBalance } from "@src/lib/utils/finance";
import {
	selectSelectedDateTotal,
	selectExpensesForSelectedDate,
} from "@src/lib/store/selectors/expenseSelectors";

const Finance = () => {
	const finance = useSelector((state: RootState) => state.finance);
	const expensesLoaded = useSelector(
		(state: RootState) => state.expenses.loaded
	);

	// Using selectors instead of direct state access
	const selectedDateExpenses = useSelector(selectExpensesForSelectedDate);
	const selectedDateTotal = useSelector(selectSelectedDateTotal);

	const { salary, currentBalance, loaded } = finance;
	const dispatch = useDispatch<AppDispatch>();

	const [viewMode, setViewMode] = useState<ViewMode>("salary");

	const simulatedRemaining = 0;

	// Use the selector result for total expenses (for selected date)
	const totalExpenses = selectedDateTotal;
	const remaining = currentBalance - totalExpenses;

	useEffect(() => {
		if (!loaded) {
			dispatch(hydrateFinance());
		}
		if (!expensesLoaded) {
			dispatch(hydrateExpenses());
		}
	}, [dispatch, loaded, expensesLoaded]);

	useEffect(() => {
		if (loaded) {
			autoUpdateBalance(finance, dispatch);
		}
	}, [finance, dispatch, loaded]);

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
				balance={currentBalance}
				expenses={totalExpenses}
				remaining={remaining}
				simulatedRemaining={simulatedRemaining}
				viewMode={viewMode}
				onChangeView={setViewMode}
			/>
			<ExpenseSections
				viewMode={viewMode}
				allExpenses={selectedDateExpenses} // Using selected date expenses for daily view
			/>
		</>
	);
};

export default Finance;

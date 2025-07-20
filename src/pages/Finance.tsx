import { useSelector } from "react-redux";
import { RootState } from "@src/lib/store/store";
import { selectTotalMonthlyExpense } from "@src/lib/store/selectors/expenseSelector";
import { useMemo, useState } from "react";
import ExpenseSummary from "@src/features/expense_tracker/ExpenseSummary";

import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { ExpenseSections } from "@src/features/expense_tracker/ExpenseSections";

const Finance = () => {
	const [viewMode, setViewMode] = useState<
		"list" | "graph" | "salary" | "simulation"
	>("list");

	const expenses = useSelector(selectTotalMonthlyExpense);
	const currentBalance = useSelector(
		(state: RootState) => state.finance.currentBalance
	);
	const simulatedRemaining = undefined; //useSelector((state: RootState) => state.finance.salary?.simulatedRemaining ?? null);
	const allExpenses = useSelector(
		(state: RootState) => state.expenses.expenses
	);

	const remaining = useMemo(
		() => currentBalance - expenses,
		[currentBalance, expenses]
	);

	return (
		<div className="text-theme">
			<TitleWithButton
				heading="Finance Tracker"
				buttonText="Export as PDF"
				onDownload={() => console.log("Exporting PDF...")}
			/>
			<ExpenseSummary
				balance={currentBalance}
				expenses={expenses}
				remaining={remaining}
				simulatedRemaining={simulatedRemaining}
				viewMode={viewMode}
				onChangeView={setViewMode}
			/>
			<ExpenseSections viewMode={viewMode} allExpenses={allExpenses} />
		</div>
	);
};

export default Finance;

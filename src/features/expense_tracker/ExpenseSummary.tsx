import { FC } from "react";
import Controls from "@src/features/expense_tracker/Controls";
import { ExpenseSummaryProps } from "@src/lib/types/expense";
import BalanceSection from "@src/features/expense_tracker/BalanceSection";

const ExpenseSummary: FC<ExpenseSummaryProps> = ({
	balance,
	expenses,
	remaining,
	simulatedRemaining,
	viewMode,
	onChangeView,
}) => {
	return (
		<div className="glassmorphic-bg p-2 rounded-none">
			<BalanceSection
				balance={balance}
				expenses={expenses}
				remaining={remaining}
				simulatedRemaining={simulatedRemaining}
				viewMode={viewMode}
			/>
			<Controls viewMode={viewMode} onChangeView={onChangeView} />
		</div>
	);
};

export default ExpenseSummary;

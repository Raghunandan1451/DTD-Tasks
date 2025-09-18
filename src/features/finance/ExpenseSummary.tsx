import { FC } from "react";
import Controls from "@src/features/finance/Controls";
import { ExpenseSummaryProps } from "@src/features/finance/type";
import BalanceSection from "@src/features/finance/BalanceSection";

const ExpenseSummary: FC<ExpenseSummaryProps> = ({
	balance,
	expenses,
	simulatedRemaining,
	viewMode,
	onChangeView,
}) => {
	return (
		<div className="glassmorphic-bg p-2 rounded-none">
			<BalanceSection
				balance={balance}
				expenses={expenses}
				simulatedRemaining={simulatedRemaining}
				viewMode={viewMode}
			/>
			<Controls
				viewMode={viewMode ?? "salary"}
				onChangeView={onChangeView}
			/>
		</div>
	);
};

export default ExpenseSummary;

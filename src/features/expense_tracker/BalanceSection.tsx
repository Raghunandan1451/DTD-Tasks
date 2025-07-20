import { BalanceSectionProps, SummaryItemProps } from "@src/lib/types/expense";
import { FC } from "react";

const BalanceSection: FC<BalanceSectionProps> = ({
	balance,
	expenses,
	remaining,
	simulatedRemaining,
	viewMode,
}) => (
	<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
		<SummaryItem
			label="Current Balance: "
			value={`${balance.toFixed(2)}`}
		/>
		<SummaryItem label="Expenses: " value={`${expenses.toFixed(2)}`} />
		<SummaryItem label="Remaining: " value={`${remaining.toFixed(2)}`} />
		{viewMode === "simulation" && (
			<SummaryItem
				label="Simulated Balance: "
				value={`${simulatedRemaining?.toFixed(2) ?? "0.00"}`}
			/>
		)}
	</div>
);

const SummaryItem: FC<SummaryItemProps> = ({ label, value }) => (
	<div className="place-self-start">
		<span className="font-semibold text-base">{label}</span>
		<span>{value}</span>
	</div>
);

export default BalanceSection;

import { FC } from "react";
import { formatAmount } from "@src/features/finance/budget_planning/lib/budgetPlanUtils";
import { PotentialSavings } from "@src/features/finance/budget_planning/lib/savingsCalculations";

interface PotentialSavingsSummaryProps {
	monthName: string;
	savings: PotentialSavings;
}

const PotentialSavingsSummary: FC<PotentialSavingsSummaryProps> = ({
	monthName,
	savings,
}) => {
	const isNegative = savings.total < 0;

	return (
		<section
			aria-label={`${monthName} potential savings`}
			className="space-y-2 rounded-lg border border-gray-200 bg-white/50 p-3 dark:border-gray-700 dark:bg-gray-800/20"
		>
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Potential savings
				</p>
				<p
					className={`text-lg font-semibold ${
						isNegative
							? "text-red-600 dark:text-red-400"
							: "text-green-600 dark:text-green-400"
					}`}
				>
					{formatAmount(savings.total)}
				</p>
			</div>

			<ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
				{savings.breakdown.map((item) => (
					<li
						key={item.categoryId}
						className={
							item.balance < 0
								? "text-red-600 dark:text-red-400"
								: ""
						}
					>
						{`${item.name || "Unnamed"}: ${formatAmount(item.balance)}`}
					</li>
				))}
			</ul>

			{savings.unassignedSpend > 0 && (
				<p className="text-xs text-amber-600 dark:text-amber-400">
					{`Unassigned spend: ${formatAmount(savings.unassignedSpend)} (not counted until linked to a category)`}
				</p>
			)}
		</section>
	);
};

export default PotentialSavingsSummary;

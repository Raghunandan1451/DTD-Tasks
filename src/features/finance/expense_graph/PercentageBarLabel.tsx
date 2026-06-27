import React from "react";

interface CategoryAmountPayload {
	percentage: number;
}

interface PercentageBarLabelProps {
	x?: number;
	y?: number;
	width?: number;
	payload?: CategoryAmountPayload;
}

/**
 * Renders a category's percentage-of-total just above its bar.
 * Used as the `label` render prop on <Bar> in ExpensesByCategoryBar.
 *
 * Reads `percentage` from the row's payload rather than the `value`
 * prop Recharts injects automatically -- that injected value is the
 * bar's own dataKey (amount), not the percentage field on the same
 * data row, so it can't be used directly here.
 */
const PercentageBarLabel: React.FC<PercentageBarLabelProps> = ({
	x = 0,
	y = 0,
	width = 0,
	payload,
}) => {
	if (!payload) return <></>;

	return (
		<text
			x={x + width / 2}
			y={y - 6}
			textAnchor="middle"
			fill="currentColor"
			className="text-xs font-medium text-gray-700 dark:text-gray-200"
		>
			{payload.percentage.toFixed(0)}%
		</text>
	);
};

export default PercentageBarLabel;

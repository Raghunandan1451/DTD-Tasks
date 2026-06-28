import React from "react";
import Button from "@src/components/ui/button/Button";
import { findRangeForDays } from "@src/features/finance/lib/findRangeForDays";
import type { VisibleRange } from "@src/features/finance/hooks/useVisibleRange";

interface DatedPoint {
	date: string;
}

const PRESETS = [
	{ label: "7d", days: 7 },
	{ label: "30d", days: 30 },
	{ label: "90d", days: 90 },
];

interface BalanceTrendRangeFilterProps {
	balanceData: DatedPoint[];
	range: VisibleRange;
	onRangeChange: (range: VisibleRange) => void;
}

/**
 * Quick date-range presets for BalanceTrendChart, so the user can jump
 * to a window directly instead of dragging the brush every time.
 * "All" shows the full series; the brush remains available afterward
 * for fine-tuning whichever preset (or full range) is selected.
 */
const BalanceTrendRangeFilter: React.FC<BalanceTrendRangeFilterProps> = ({
	balanceData,
	range,
	onRangeChange,
}) => {
	const fullRange: VisibleRange = {
		startIndex: 0,
		endIndex: Math.max(balanceData.length - 1, 0),
	};
	const isFullRangeActive =
		range.startIndex === fullRange.startIndex &&
		range.endIndex === fullRange.endIndex;

	return (
		<div className="flex gap-2">
			{PRESETS.map(({ label, days }) => {
				const presetRange = findRangeForDays(balanceData, days);
				const isActive =
					range.startIndex === presetRange.startIndex &&
					range.endIndex === presetRange.endIndex;

				return (
					<Button
						key={label}
						onClick={() => onRangeChange(presetRange)}
						className={`px-3 py-1 rounded-md text-sm whitespace-nowrap ${
							isActive
								? "bg-blue-500 text-white"
								: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
						}`}
					>
						{label}
					</Button>
				);
			})}
			<Button
				onClick={() => onRangeChange(fullRange)}
				className={`px-3 py-1 rounded-md text-sm whitespace-nowrap ${
					isFullRangeActive
						? "bg-blue-500 text-white"
						: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
				}`}
			>
				All
			</Button>
		</div>
	);
};

export default BalanceTrendRangeFilter;

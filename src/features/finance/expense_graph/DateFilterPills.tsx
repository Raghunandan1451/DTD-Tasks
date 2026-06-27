import React from "react";
import { DateFilter } from "@src/features/finance/type";
import Button from "@src/components/ui/button/Button";

const DATE_FILTER_OPTIONS: DateFilter[] = ["today", "yesterday", "weekly", "monthly", "yearly"];

interface DateFilterPillsProps {
	value: DateFilter;
	onChange: (filter: DateFilter) => void;
}

/** Row of quick date-range filter pills, extracted from ExpensesByCategoryBar. */
const DateFilterPills: React.FC<DateFilterPillsProps> = ({ value, onChange }) => (
	<div className="flex gap-2 overflow-x-auto scrollbar-hide">
		{DATE_FILTER_OPTIONS.map((opt) => (
			<Button
				key={opt}
				onClick={() => onChange(opt)}
				className={`px-3 py-1 rounded-md text-sm whitespace-nowrap ${
					value === opt
						? "bg-blue-500 text-white"
						: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
				}`}
			>
				{opt}
			</Button>
		))}
	</div>
);

export default DateFilterPills;

import { FC } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Button from "@src/components/ui/button/Button";

interface BudgetMonthHeaderProps {
	monthDate: Date;
	totalPercentage: number;
	onPreviousMonth: () => void;
	onNextMonth: () => void;
	onAddCategory: () => void;
}

const BudgetMonthHeader: FC<BudgetMonthHeaderProps> = ({
	monthDate,
	totalPercentage,
	onPreviousMonth,
	onNextMonth,
	onAddCategory,
}) => {
	const overallocated = totalPercentage > 100;
	const underallocated = totalPercentage < 100;

	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div className="flex items-center gap-1">
				<Button
					type="button"
					onClick={onPreviousMonth}
					aria-label="Previous budget month"
					className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<h2 className="min-w-32 text-center font-semibold" aria-live="polite">
					{format(monthDate, "MMMM yyyy")}
				</h2>
				<Button
					type="button"
					onClick={onNextMonth}
					aria-label="Next budget month"
					className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				{underallocated && (
					<p
						role="status"
						className="text-sm text-amber-700 dark:text-amber-300"
					>
						{(100 - totalPercentage).toFixed(1)}% unallocated
					</p>
				)}
				{overallocated && (
					<p
						role="status"
						className="text-sm text-amber-700 dark:text-amber-300"
					>
						Allocations exceed 100%
					</p>
				)}
				<Button
					type="button"
					onClick={onAddCategory}
					className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
				>
					<Plus className="h-4 w-4" />
					Add category
				</Button>
			</div>
		</div>
	);
};

export default BudgetMonthHeader;

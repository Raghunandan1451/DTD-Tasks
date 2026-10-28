import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { useDispatch, useSelector } from "react-redux";
import { selectSelectedDate } from "@src/lib/store/selectors/expenseSelectors";
import {
	shiftSelectedDate,
	setSelectedDate,
} from "@src/lib/store/slices/expensesSlice";
import { parseISODate, todayISO } from "@src/lib/utils/isoDate";
import DatePickerPopover from "@src/features/finance/expense_list/DatePickerPopover";

const stepButton =
	"p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed";

const ExpenseNavigation: React.FC = () => {
	const dispatch = useDispatch();
	const selectedDate = useSelector(selectSelectedDate);
	const [pickerOpen, setPickerOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const today = todayISO();
	const isToday = selectedDate >= today;
	// Stepping a month forward from the current month would only snap back to today
	const isCurrentMonth = selectedDate.slice(0, 7) >= today.slice(0, 7);

	useEffect(() => {
		if (!pickerOpen) return;
		const handleOutsideClick = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setPickerOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () =>
			document.removeEventListener("mousedown", handleOutsideClick);
	}, [pickerOpen]);

	return (
		<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
			<div
				ref={containerRef}
				className="relative flex items-center gap-2"
			>
				<Button
					onClick={() => dispatch(shiftSelectedDate({ months: -1 }))}
					className={stepButton}
					title="Previous month"
					aria-label="Previous month"
				>
					<ChevronsLeft size={16} />
				</Button>
				<Button
					onClick={() => dispatch(shiftSelectedDate({ days: -1 }))}
					className={stepButton}
					title="Previous day"
					aria-label="Previous day"
				>
					<ChevronLeft size={16} />
				</Button>
				<Button
					onClick={() => setPickerOpen((open) => !open)}
					className="text-lg font-semibold px-2 rounded hover:bg-gray-500/50 dark:hover:bg-gray-700/50"
					title="Pick a date"
					aria-label="Pick a date"
					aria-haspopup="dialog"
					aria-expanded={pickerOpen}
				>
					{format(parseISODate(selectedDate), "dd MMM yyyy")} ▾
				</Button>
				<Button
					onClick={() => dispatch(shiftSelectedDate({ days: 1 }))}
					disabled={isToday}
					className={stepButton}
					title="Next day"
					aria-label="Next day"
				>
					<ChevronRight size={16} />
				</Button>
				<Button
					onClick={() => dispatch(shiftSelectedDate({ months: 1 }))}
					disabled={isCurrentMonth}
					className={stepButton}
					title="Next month"
					aria-label="Next month"
				>
					<ChevronsRight size={16} />
				</Button>
				{!isToday && (
					<Button
						onClick={() => dispatch(setSelectedDate(today))}
						className="text-xs px-2 py-1 rounded border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
					>
						Today
					</Button>
				)}

				{pickerOpen && (
					<DatePickerPopover
						selectedDate={selectedDate}
						onSelect={(iso) => dispatch(setSelectedDate(iso))}
						onClose={() => setPickerOpen(false)}
					/>
				)}
			</div>
		</div>
	);
};

export default ExpenseNavigation;

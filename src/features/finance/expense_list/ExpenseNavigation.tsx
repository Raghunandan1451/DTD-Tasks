import React from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@src/lib/store/store";
import {
	goToPreviousDay,
	goToNextDay,
	setSelectedDate,
} from "@src/lib/store/slices/expensesSlice";

const ExpenseNavigation: React.FC = () => {
	const dispatch = useDispatch();
	const selectedDate = useSelector(
		(state: RootState) => state.expenses.selectedDate
	);
	const selectedDateObj = new Date(selectedDate);

	const handlePrevious = () => {
		dispatch(goToPreviousDay());
	};

	const handleNext = () => {
		const today = new Date();
		const nextDay = new Date(selectedDate);
		nextDay.setDate(nextDay.getDate() + 1);

		if (nextDay <= today) {
			dispatch(goToNextDay());
		}
	};

	const handleToday = () => {
		dispatch(setSelectedDate(new Date().toISOString().split("T")[0]));
	};

	return (
		<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
			<div className="flex items-center gap-2">
				<Button
					onClick={handlePrevious}
					className="bg-gray-200 dark:bg-gray-700 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
				>
					<ChevronLeft size={16} />
				</Button>
				<span
					className="text-lg font-semibold cursor-pointer hover:text-blue-500"
					onClick={handleToday}
					title="Click to go to today"
				>
					{format(selectedDateObj, "dd MMM yyyy")}
				</span>
				<Button
					onClick={handleNext}
					className="bg-gray-200 dark:bg-gray-700 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
				>
					<ChevronRight size={16} />
				</Button>
			</div>
		</div>
	);
};

export default ExpenseNavigation;

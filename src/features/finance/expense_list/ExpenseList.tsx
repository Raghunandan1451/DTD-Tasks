import { FC, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@src/lib/store/store";
import ExpenseNavigation from "@src/features/finance/expense_list/ExpenseNavigation";
import GroupFilter from "@src/features/finance/expense_list/GroupFilter";
import ExpenseTable from "@src/features/finance/expense_list/ExpenseTable";
import ExpenseEntryForm from "@src/features/finance/expense_list/ExpenseEntryForm";
import {
	selectSelectedDateTotal,
	selectSelectedDateCredits,
	selectExpenseGroups,
	selectFilteredExpensesForSelectedDate,
	selectSelectedDate,
} from "@src/lib/store/selectors/expenseSelectors";
import { selectFinanceGroups } from "@src/lib/store/selectors/financeSelectors";
import {
	updateExpense,
	deleteExpense,
} from "@src/lib/store/slices/expensesSlice";
import { ExpenseEntry } from "@src/features/finance/type";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
import { parseISODate } from "@src/lib/utils/isoDate";

interface ExpenseListProps {
	showNotification?: ShowNotificationFn;
}

const ExpenseList: FC<ExpenseListProps> = ({ showNotification }) => {
	const dispatch = useDispatch<AppDispatch>();
	const [selectedGroup, setSelectedGroup] = useState<string | null>("All");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const dailyExpenses = useSelector(selectSelectedDateTotal); // Debits only
	const dailyCredits = useSelector(selectSelectedDateCredits); // Credits only
	const expenseGroups = useSelector(selectExpenseGroups);
	const selectedDate = useSelector(selectSelectedDate);
	const financeGroups = useSelector(selectFinanceGroups);

	const availableGroups =
		expenseGroups.length > 0 ? expenseGroups : financeGroups;

	const filteredExpenses = useSelector((state: RootState) =>
		selectFilteredExpensesForSelectedDate(state, selectedGroup),
	);

	const dailyNet = dailyCredits - dailyExpenses;

	const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedGroup, selectedDate]);

	const handlePrevious = () => {
		setCurrentPage((prev) => Math.max(prev - 1, 1));
	};

	const handleNext = () => {
		setCurrentPage((prev) => Math.min(prev + 1, totalPages));
	};

	const handleSaveEdit = (updatedExpense: ExpenseEntry) => {
		dispatch(updateExpense(updatedExpense));
	};

	const handleDelete = (expenseId: string) => {
		dispatch(deleteExpense(expenseId));
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<ExpenseNavigation />

				{totalPages > 1 && (
					<div className="flex items-center gap-2 text-xs">
						<Button
							onClick={handlePrevious}
							disabled={currentPage === 1}
							className="p-1 backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-white/15 transition-all duration-300"
							title="Previous page"
						>
							<ChevronLeft className="w-3 h-3" />
						</Button>

						<span className="px-2 text-xs font-medium text-gray-800 dark:text-gray-200 backdrop-blur-md bg-white/10 dark:bg-white/5 rounded py-1">
							{currentPage}/{totalPages}
						</span>

						<Button
							onClick={handleNext}
							disabled={currentPage === totalPages}
							className="p-1 backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-white/15 transition-all duration-300"
							title="Next page"
						>
							<ChevronRight className="w-3 h-3" />
						</Button>
					</div>
				)}

				<GroupFilter
					groups={availableGroups}
					selectedGroup={selectedGroup}
					onChangeGroup={setSelectedGroup}
				/>
			</div>

			<ExpenseEntryForm />

			<ExpenseTable
				expenses={paginatedExpenses}
				groups={availableGroups}
				onEdit={handleSaveEdit}
				onDelete={handleDelete}
				showNotification={showNotification}
			/>

			{/* Updated daily summary to show expenses, credits, and net */}
			<div className="mt-4 border-t border-white/20 pt-2 text-right text-sm text-gray-700 dark:text-gray-300 flex flex-wrap justify-end gap-4">
				<div>
					Day:{" "}
					{parseISODate(selectedDate).toLocaleDateString("en-GB", {
						day: "2-digit",
						month: "short",
						year: "numeric",
					})}
				</div>

				{dailyCredits > 0 && (
					<div className="text-green-600 dark:text-green-400">
						Received:{" "}
						<span className="font-medium">
							+{dailyCredits.toFixed(2)}
						</span>
					</div>
				)}

				{dailyExpenses > 0 && (
					<div className="text-red-600 dark:text-red-400">
						Spent:{" "}
						<span className="font-medium">
							-{dailyExpenses.toFixed(2)}
						</span>
					</div>
				)}

				<div
					className={`font-semibold ${
						dailyNet >= 0
							? "text-green-600 dark:text-green-400"
							: "text-red-600 dark:text-red-400"
					}`}
				>
					Net:{" "}
					<span>
						{dailyNet >= 0 ? "+" : ""}
						{dailyNet.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	);
};

export default ExpenseList;

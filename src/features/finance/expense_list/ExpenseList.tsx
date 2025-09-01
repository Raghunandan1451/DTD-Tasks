// Updated ExpenseList.tsx with net daily total (expenses - credits)
import { FC, useState, useMemo, useEffect } from "react";
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
} from "@src/lib/store/selectors/expenseSelectors";
import {
	updateExpense,
	deleteExpense,
} from "@src/lib/store/slices/expensesSlice";
import { ExpenseEntry } from "@src/lib/types/finance";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ExpenseListProps {
	expenses?: ExpenseEntry[];
}

const ExpenseList: FC<ExpenseListProps> = ({ expenses: propExpenses }) => {
	const dispatch = useDispatch<AppDispatch>();
	const [selectedGroup, setSelectedGroup] = useState<string | null>("All");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Get data from Redux using selectors
	const dailyExpenses = useSelector(selectSelectedDateTotal); // Debits only
	const dailyCredits = useSelector(selectSelectedDateCredits); // Credits only
	const expenseGroups = useSelector(selectExpenseGroups);
	const selectedDate = useSelector(
		(state: RootState) => state.expenses.selectedDate
	);

	// Get finance groups as fallback
	const financeGroups = useSelector(
		(state: RootState) => state.finance.groups ?? []
	);

	// Use expense groups from expenses data, fallback to finance groups
	const availableGroups =
		expenseGroups.length > 0 ? expenseGroups : financeGroups;

	// Use filtered expenses selector
	const filteredExpenses = useSelector((state: RootState) =>
		selectFilteredExpensesForSelectedDate(state, selectedGroup)
	);

	// If expenses are passed as props, use them instead (with local filtering)
	const finalExpenses = useMemo(() => {
		if (propExpenses) {
			const dateFiltered = propExpenses.filter(
				(expense) => expense.date === selectedDate
			);
			if (!selectedGroup || selectedGroup === "All") {
				return dateFiltered;
			}
			return dateFiltered.filter(
				(expense) => expense.group === selectedGroup
			);
		}
		return filteredExpenses;
	}, [propExpenses, filteredExpenses, selectedDate, selectedGroup]);

	// Calculate final daily totals
	const finalDailyExpenses = useMemo(() => {
		if (propExpenses) {
			return propExpenses
				.filter(
					(expense) =>
						expense.date === selectedDate && expense.type !== "Cr"
				)
				.reduce((total, expense) => total + expense.amount, 0);
		}
		return dailyExpenses;
	}, [propExpenses, selectedDate, dailyExpenses]);

	const finalDailyCredits = useMemo(() => {
		if (propExpenses) {
			return propExpenses
				.filter(
					(expense) =>
						expense.date === selectedDate && expense.type === "Cr"
				)
				.reduce((total, expense) => total + expense.amount, 0);
		}
		return dailyCredits;
	}, [propExpenses, selectedDate, dailyCredits]);

	// Calculate net for the day (credits - expenses)
	const dailyNet = finalDailyCredits - finalDailyExpenses;

	// Calculate pagination
	const totalPages = Math.ceil(finalExpenses.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedExpenses = finalExpenses.slice(startIndex, endIndex);

	// Reset pagination when filters change
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
						<button
							onClick={handlePrevious}
							disabled={currentPage === 1}
							className="p-1 backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-white/15 transition-all duration-300"
							title="Previous page"
						>
							<ChevronLeft className="w-3 h-3" />
						</button>

						<span className="px-2 text-xs font-medium text-gray-800 dark:text-gray-200 backdrop-blur-md bg-white/10 dark:bg-white/5 rounded py-1">
							{currentPage}/{totalPages}
						</span>

						<button
							onClick={handleNext}
							disabled={currentPage === totalPages}
							className="p-1 backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/30 dark:hover:bg-white/15 transition-all duration-300"
							title="Next page"
						>
							<ChevronRight className="w-3 h-3" />
						</button>
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
			/>

			{/* Updated daily summary to show expenses, credits, and net */}
			<div className="mt-4 border-t border-white/20 pt-2 text-right text-sm text-gray-700 dark:text-gray-300 flex flex-wrap justify-end gap-4">
				<div>
					Day:{" "}
					{new Date(selectedDate).toLocaleDateString("en-GB", {
						day: "2-digit",
						month: "short",
						year: "numeric",
					})}
				</div>

				{finalDailyCredits > 0 && (
					<div className="text-green-600 dark:text-green-400">
						Income:{" "}
						<span className="font-medium">
							+{finalDailyCredits.toFixed(2)}
						</span>
					</div>
				)}

				{finalDailyExpenses > 0 && (
					<div className="text-red-600 dark:text-red-400">
						Expenses:{" "}
						<span className="font-medium">
							-{finalDailyExpenses.toFixed(2)}
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

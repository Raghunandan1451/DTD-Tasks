import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { useEffect, useState } from "react";
import ExpenseSummary from "@src/features/finance/ExpenseSummary";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import { ExpenseSections } from "@src/features/finance/ExpenseSections";
import { ViewMode } from "@src/features/finance/type";
import {
	selectExpensesForSelectedDate,
	selectCalculatedBalance,
	selectTotalAllExpenses,
} from "@src/lib/store/selectors/expenseSelectors";
import { generateMonthlyExpenseReportPDF } from "@src/lib/utils/downloadHandler/expenseReports";
import useNotifications from "@src/lib/hooks/useNotifications";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import { useFinanceHydration } from "@src/features/finance/hooks/useFinanceHydration";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";
import {
	setBudgetPlanForMonth,
	setFinanceState,
} from "@src/lib/store/slices/financeSlice";
import { setExpenses } from "@src/lib/store/slices/expensesSlice";
import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import {
	deleteOutputFile,
	queueOutputWrite,
	readOutputFile,
	readOutputFiles,
	writeOutputFile,
} from "@src/lib/utils/fileStorage/outputFiles";
import { hasOutputDirectory } from "@src/lib/utils/fileStorage/outputDirectory";

const isFinanceState = (value: unknown): value is FinanceState => {
	if (typeof value !== "object" || value === null) return false;
	return (
		"salary" in value &&
		(value.salary === null ||
			(typeof value.salary === "object" &&
				value.salary !== null &&
				"amount" in value.salary &&
				typeof value.salary.amount === "number" &&
				"dayOfMonth" in value.salary &&
				typeof value.salary.dayOfMonth === "number")) &&
		"currentBalance" in value &&
		typeof value.currentBalance === "number" &&
		"manualOverride" in value &&
		typeof value.manualOverride === "boolean" &&
		"groups" in value &&
		Array.isArray(value.groups) &&
		value.groups.every((group) => typeof group === "string") &&
		"loaded" in value &&
		typeof value.loaded === "boolean"
	);
};

const isExpenseEntry = (value: unknown): value is ExpenseEntry =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	typeof value.id === "string" &&
	"date" in value &&
	typeof value.date === "string" &&
	/^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
	"name" in value &&
	typeof value.name === "string" &&
	"amount" in value &&
	typeof value.amount === "number" &&
	Number.isFinite(value.amount) &&
	"group" in value &&
	typeof value.group === "string" &&
	(!("type" in value) ||
		value.type === undefined ||
		value.type === "Cr" ||
		value.type === "Dr");

const ExpenseTracker = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { notifications, showNotification } = useNotifications();

	const finance = useSelector((state: RootState) => state.finance);
	const expensesState = useSelector((state: RootState) => state.expenses);
	const expenses = expensesState.expenses;
	const expensesLoaded = expensesState.loaded;

	const selectedDateExpenses = useSelector(selectExpensesForSelectedDate);
	const calculatedBalance = useSelector(selectCalculatedBalance);
	const totalAllExpenses = useSelector(selectTotalAllExpenses);

	const { salary, currentBalance, loaded } = finance;

	const [viewMode, setViewMode] = useState<ViewMode>("salary");
	const [outputHydrated, setOutputHydrated] = useState(false);
	const budgetCategories =
		finance.budgetCategories ?? DEFAULT_BUDGET_CATEGORIES;

	useFinanceHydration(finance, expenses, expensesLoaded);

	useEffect(() => {
		if (loaded && salary && currentBalance) {
			setViewMode("list");
		}
	}, [loaded, salary, currentBalance]);

	useEffect(() => {
		if (!loaded || !expensesLoaded || outputHydrated) return;
		let cancelled = false;
		void (async () => {
			if (!(await hasOutputDirectory())) {
				setOutputHydrated(true);
				return;
			}

			const financeJSON = await readOutputFile(
				"Expenses/finance-data.json",
			);
			if (financeJSON) {
				const parsed: unknown = JSON.parse(financeJSON);
				if (isFinanceState(parsed)) {
					dispatch(setFinanceState(parsed));
				} else {
					throw new Error("Invalid Finance JSON file.");
				}
			}

			const monthlyFiles = await readOutputFiles(
				"Expenses",
				(name) =>
					name.startsWith("expenses-") && name.endsWith(".json"),
			);
			const expensesIndex = await readOutputFile("Expenses/index.json");
			if (expensesIndex) {
				const index: unknown = JSON.parse(expensesIndex);
				if (
					typeof index !== "object" ||
					index === null ||
					!("months" in index) ||
					!Array.isArray(index.months) ||
					!index.months.every(
						(month) =>
							typeof month === "string" &&
							/^\d{4}-\d{2}$/.test(month),
					)
				) {
					throw new Error("Invalid Expenses index JSON file.");
				}
			}
			const loadedExpenses = monthlyFiles.flatMap(({ content }) => {
				const parsed: unknown = JSON.parse(content);
				if (
					typeof parsed !== "object" ||
					parsed === null ||
					!("expenses" in parsed) ||
					!Array.isArray(parsed.expenses)
				) {
					throw new Error("Invalid Expenses JSON file.");
				}
				if (!parsed.expenses.every(isExpenseEntry)) {
					throw new Error("Expenses JSON contains invalid expense data.");
				}
				return parsed.expenses;
			});

			if (!cancelled) {
				if (monthlyFiles.length > 0 || expensesIndex !== null) {
					const uniqueExpenses = Array.from(
						new Map(
							loadedExpenses.map((expense) => [
								expense.id,
								expense,
							]),
						).values(),
					);
					dispatch(setExpenses(uniqueExpenses));
				}
				setOutputHydrated(true);
			}
		})().catch((error: unknown) => {
			if (!cancelled) {
				console.error("Failed to load Expenses JSON files:", error);
				showNotification(
					error instanceof Error
						? error.message
						: "Unable to read saved Expenses JSON files",
					"error",
				);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [
		dispatch,
		expensesLoaded,
		loaded,
		outputHydrated,
		showNotification,
	]);

	useEffect(() => {
		if (!outputHydrated || !loaded || !expensesLoaded) return;
		void queueOutputWrite(async () => {
			if (!(await hasOutputDirectory())) return;
			await writeOutputFile(
				"Expenses/finance-data.json",
				JSON.stringify(finance, null, 2),
			);
		}).catch((error: unknown) => {
			console.error("Failed to save Finance JSON:", error);
			showNotification(
				error instanceof Error
					? error.message
					: "Unable to save Finance JSON",
				"error",
			);
		});
	}, [expensesLoaded, finance, loaded, outputHydrated, showNotification]);

	useEffect(() => {
		if (!outputHydrated || !loaded || !expensesLoaded) return;
		const timeout = window.setTimeout(() => {
			void queueOutputWrite(async () => {
				if (!(await hasOutputDirectory())) return;
				const monthKeys = Array.from(
					new Set(expenses.map((expense) => expense.date.substring(0, 7))),
				).sort();
				const expectedPaths = new Set(
					monthKeys.flatMap((month) => {
						const [year, monthNumber] = month.split("-");
						const basePath = `Expenses/${year}/${monthNumber}/expenses-${month}`;
						return [`${basePath}.json`, `${basePath}.pdf`];
					}),
				);
				const existingJSON = await readOutputFiles(
					"Expenses",
					(name) =>
						name.startsWith("expenses-") &&
						(name.endsWith(".json") || name.endsWith(".pdf")),
				);
				await Promise.all(
					existingJSON
						.filter(({ path }) => !expectedPaths.has(path))
						.map(({ path }) => deleteOutputFile(path)),
				);

				await Promise.all(
					monthKeys.map(async (month) => {
						const [year, monthNumber] = month.split("-");
						const monthExpenses = expenses.filter(
							(expense) => expense.date.substring(0, 7) === month,
						);
						await Promise.all([
							writeOutputFile(
								`Expenses/${year}/${monthNumber}/expenses-${month}.json`,
								JSON.stringify(
									{ month, expenses: monthExpenses },
									null,
									2,
								),
							),
							writeOutputFile(
								`Expenses/${year}/${monthNumber}/expenses-${month}.pdf`,
								generateMonthlyExpenseReportPDF(
									finance.currentBalance,
									expenses,
									month,
								),
							),
						]);
					}),
				);
				await writeOutputFile(
					"Expenses/index.json",
					JSON.stringify({ months: monthKeys }, null, 2),
				);
			}).catch((error: unknown) => {
				console.error("Failed to save Expenses files:", error);
				showNotification(
					error instanceof Error
						? error.message
						: "Unable to save Expenses files",
					"error",
				);
			});
		}, 600);
		return () => window.clearTimeout(timeout);
	}, [
		expenses,
		expensesLoaded,
		finance.currentBalance,
		loaded,
		outputHydrated,
		showNotification,
	]);

	return (
		<>
			<TitleWithButton heading="Expense Tracker" />
			<ExpenseSummary
				balance={calculatedBalance}
				expenses={totalAllExpenses}
				viewMode={viewMode}
				onChangeView={setViewMode}
			/>
			<ExpenseSections
				viewMode={viewMode}
				allExpenses={expenses}
				datedExpenses={selectedDateExpenses}
				budgetCategories={budgetCategories}
				budgetPlansByMonth={finance.budgetPlansByMonth}
				onBudgetPlanChange={(month, categories) =>
					dispatch(setBudgetPlanForMonth({ month, categories }))
				}
				currentBalance={currentBalance}
				monthlyIncome={finance.salary?.amount ?? 0}
				showNotification={showNotification}
			/>
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default ExpenseTracker;

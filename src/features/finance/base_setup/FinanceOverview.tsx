import { useMemo } from "react";
import { useSelector } from "react-redux";
import BalanceTrendChart from "@src/features/finance/expense_graph/BalanceTrendChart";
import ExpensesByCategoryBar from "@src/features/finance/expense_graph/ExpensesByCategoryBar";
import IncomeVsSpendingChart from "@src/features/finance/expense_graph/IncomeVsSpendingChart";
import FinanceSetupPanel from "@src/features/finance/base_setup/FinanceSetupPanel";
import ZoomableChart from "@src/components/shared/chart_zoom/ZoomableChart";
import { selectRecurring } from "@src/lib/store/selectors/financeSelectors";
import { buildMonthlyFlow } from "@src/features/finance/lib/monthlyFlow";
import { monthlyEquivalent } from "@src/features/finance/lib/recurring";
import type { ExpenseEntry, SalaryHistoryEntry } from "@src/features/finance/type";

interface FinanceOverviewProps {
	expenses: ExpenseEntry[];
	salaryHistory?: SalaryHistoryEntry[];
	/** Current salary, used for months with no salary credit yet */
	monthlyIncome: number;
	/** Opening balance the trend chart starts from */
	startingBalance?: number;
	/** Balance right now, after all entries */
	balance?: number;
}

/** Small enough that all three charts fit on screen together */
const CHART_HEIGHT = 230;

const money = (value: number): string =>
	value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const Tile: React.FC<{ label: string; value: string; tone?: string; hint?: string }> = ({
	label,
	value,
	tone = "text-gray-900 dark:text-white",
	hint,
}) => (
	<div className="rounded-lg border bg-white/20 px-3 py-2 backdrop-blur-xl dark:bg-black/20">
		<p className="text-xs text-gray-600 dark:text-gray-300">{label}</p>
		<p className={`text-lg font-semibold ${tone}`}>{value}</p>
		{hint && <p className="text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>}
	</div>
);

/**
 * The finance home: this month at a glance and the three graphs side by side
 * (each can be zoomed; the category and trend filters only show once zoomed). Setup and recurring payments sit to the right.
 */
const FinanceOverview: React.FC<FinanceOverviewProps> = ({
	expenses,
	salaryHistory,
	monthlyIncome,
	startingBalance = 0,
	balance = 0,
}) => {
	const recurring = useSelector(selectRecurring);

	const flow = useMemo(
		() => buildMonthlyFlow(expenses, salaryHistory, monthlyIncome),
		[expenses, salaryHistory, monthlyIncome],
	);
	const thisMonth = flow[flow.length - 1];
	const committed = recurring.reduce((sum, item) => sum + monthlyEquivalent(item), 0);

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
				<Tile
					label="Income this month"
					value={money(thisMonth.income)}
					hint={thisMonth.estimated ? "Estimated from salary" : undefined}
				/>
				<Tile label="Spent this month" value={money(thisMonth.spent)} />
				<Tile
					label={thisMonth.saved >= 0 ? "Saved this month" : "Over income"}
					value={money(Math.abs(thisMonth.saved))}
					tone={
						thisMonth.saved >= 0
							? "text-green-700 dark:text-green-300"
							: "text-red-700 dark:text-red-300"
					}
					hint={thisMonth.saved < 0 ? "Paid from savings" : undefined}
				/>
				<Tile label="Balance" value={money(balance)} />
				<Tile label="Recurring / month" value={money(committed)} hint="Average, all schedules" />
			</div>

			<div className="flex flex-col gap-3 xl:flex-row xl:items-start">
				<div className="grid min-w-0 flex-1 gap-3 lg:grid-cols-3 lg:items-start">
					<ZoomableChart title="Income vs spending" height={CHART_HEIGHT}>
						{({ height, zoomButton }) => (
							<IncomeVsSpendingChart data={flow} height={height} headerExtra={zoomButton} />
						)}
					</ZoomableChart>
					<ZoomableChart title="Balance trend" height={CHART_HEIGHT}>
						{({ height, zoomButton, zoomed }) => (
							<BalanceTrendChart
								showFilters={zoomed}
								expenses={expenses}
								initialBalance={startingBalance}
								height={height}
								headerExtra={zoomButton}
							/>
						)}
					</ZoomableChart>
					<ZoomableChart title="Expenses by category" height={CHART_HEIGHT}>
						{({ height, zoomButton, zoomed }) => (
							<ExpensesByCategoryBar
								expenses={expenses}
								height={height}
								headerExtra={zoomButton}
								showFilters={zoomed}
							/>
						)}
					</ZoomableChart>
				</div>
				<FinanceSetupPanel />
			</div>
		</div>
	);
};

export default FinanceOverview;

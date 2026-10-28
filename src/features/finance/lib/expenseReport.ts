import type { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import {
	BalanceTrendPoint,
	buildBalanceTrend,
	buildBalanceTrendForAllTime,
} from "@src/features/finance/lib/balanceTrend";
import {
	CategoryAmount,
	groupExpensesByCategory,
} from "@src/features/finance/lib/categoryGrouping";
import {
	getDefaultCategories,
	getMonthlyDebitExpenses,
	isSavingsCategory,
} from "@src/features/finance/budget_planning/lib/budgetPlanUtils";
import {
	calculatePotentialSavings,
	getSalaryForMonth,
	MonthlyIncome,
	resolveMonthlyIncome,
} from "@src/features/finance/budget_planning/lib/savingsCalculations";
import { formatISODate, parseISODate } from "@src/lib/utils/isoDate";

export interface ReportCategoryRow {
	categoryId: string;
	name: string;
	percentage: number;
	allocation: number;
	spent: number;
	/** allocation - spent; negative when overspent */
	left: number;
}

/** Balance movement and the needs/wants/savings split for one month */
export interface MonthTrend {
	openingBalance: number;
	credits: number;
	debits: number;
	closingBalance: number;
	income: MonthlyIncome;
	categories: ReportCategoryRow[];
	savingsPercentage: number;
	savingsAllocation: number;
	/** Month debits not linked to any category, so rows reconcile with the expense list */
	unassignedSpend: number;
	potentialSavings: number;
}

export interface ReportDay {
	date: string;
	entries: ExpenseEntry[];
}

export interface ReportMonth {
	monthKey: string;
	/** Newest day first */
	days: ReportDay[];
	trend: MonthTrend;
}

export interface ExpenseReport {
	title: string;
	totals: { credits: number; debits: number; net: number };
	/** Newest month first */
	months: ReportMonth[];
	/** Sums across `months`; shown as a totals row when there is more than one */
	trendTotals: {
		income: number;
		credits: number;
		debits: number;
		potentialSavings: number;
	};
	balanceSeries: BalanceTrendPoint[];
	categoryTotals: CategoryAmount[];
}

interface BuildExpenseReportOptions {
	/** Undefined when only expenses are available (e.g. nothing set up yet) */
	financeData?: FinanceState;
	/** Every expense, not just the reported period, so balances carry over */
	allExpenses: ExpenseEntry[];
	title: string;
	/** "yyyy-MM". Omit to report every month that has entries */
	monthKey?: string;
	today?: Date;
}

const sum = (entries: ExpenseEntry[]): number =>
	entries.reduce((total, entry) => total + entry.amount, 0);

const isCredit = (entry: ExpenseEntry): boolean => entry.type === "Cr";

const net = (entries: ExpenseEntry[]): number =>
	sum(entries.filter(isCredit)) - sum(entries.filter((e) => !isCredit(e)));

const groupByDay = (entries: ExpenseEntry[]): ReportDay[] => {
	const byDate = new Map<string, ExpenseEntry[]>();
	entries.forEach((entry) => {
		byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
	});
	return [...byDate.entries()]
		.sort(([a], [b]) => b.localeCompare(a))
		.map(([date, dayEntries]) => ({ date, entries: dayEntries }));
};

const buildMonthTrend = (
	monthKey: string,
	monthEntries: ExpenseEntry[],
	allExpenses: ExpenseEntry[],
	financeData: FinanceState | undefined,
): MonthTrend => {
	const initialBalance = financeData?.currentBalance ?? 0;
	const openingBalance =
		initialBalance + net(allExpenses.filter((e) => e.date < `${monthKey}-01`));
	const credits = sum(monthEntries.filter(isCredit));
	const debits = sum(monthEntries.filter((e) => !isCredit(e)));

	// Same inputs the Budget Planner screen uses, so the PDF matches the app
	const categories =
		financeData?.budgetPlansByMonth?.[monthKey] ??
		getDefaultCategories(financeData?.budgetCategories, monthKey);
	const income = resolveMonthlyIncome(
		monthKey,
		allExpenses,
		getSalaryForMonth(
			monthKey,
			financeData?.salaryHistory,
			financeData?.salary?.amount ?? 0,
		),
	);
	const savings = calculatePotentialSavings({
		categories,
		income: income.amount,
		monthlyExpenses: getMonthlyDebitExpenses(allExpenses, monthKey),
	});

	const percentageById = new Map(categories.map((c) => [c.id, c.percentage]));

	return {
		openingBalance,
		credits,
		debits,
		closingBalance: openingBalance + credits - debits,
		income,
		categories: savings.breakdown.map((row) => ({
			categoryId: row.categoryId,
			name: row.name,
			percentage: percentageById.get(row.categoryId) ?? 0,
			allocation: row.allocation,
			spent: row.spent,
			left: row.balance,
		})),
		savingsPercentage: categories
			.filter(isSavingsCategory)
			.reduce((total, category) => total + category.percentage, 0),
		savingsAllocation: savings.savingsAllocation,
		unassignedSpend: savings.unassignedSpend,
		potentialSavings: savings.total,
	};
};

const buildBalanceSeries = (
	allExpenses: ExpenseEntry[],
	initialBalance: number,
	monthKey: string | undefined,
	today: Date,
): BalanceTrendPoint[] => {
	if (!monthKey) {
		return buildBalanceTrendForAllTime(allExpenses, initialBalance, 30);
	}

	const [year, month] = monthKey.split("-").map(Number);
	const start = new Date(year, month - 1, 1);
	const monthEnd = new Date(year, month, 0);
	const isCurrentMonth = formatISODate(today).startsWith(monthKey);
	const end = isCurrentMonth && today < monthEnd ? today : monthEnd;
	const opening =
		initialBalance +
		net(allExpenses.filter((e) => e.date < formatISODate(start)));

	return buildBalanceTrend(
		allExpenses.filter((e) => e.date.startsWith(monthKey)),
		opening,
		{ start, end },
	);
};

/**
 * Collects everything the PDF needs: the expense list, the per-month balance
 * trend with needs/wants/savings, and the series behind the graphs. Pure, so
 * it can be tested without rendering a PDF.
 */
export const buildExpenseReport = ({
	financeData,
	allExpenses,
	title,
	monthKey,
	today = new Date(),
}: BuildExpenseReportOptions): ExpenseReport => {
	const reportExpenses = monthKey
		? allExpenses.filter((e) => e.date.startsWith(monthKey))
		: allExpenses;

	const monthKeys = monthKey
		? [monthKey]
		: [...new Set(reportExpenses.map((e) => e.date.slice(0, 7)))].sort(
				(a, b) => b.localeCompare(a),
			);

	const months = monthKeys.map((key) => {
		const monthEntries = reportExpenses.filter((e) => e.date.startsWith(key));
		return {
			monthKey: key,
			days: groupByDay(monthEntries),
			trend: buildMonthTrend(key, monthEntries, allExpenses, financeData),
		};
	});

	const credits = sum(reportExpenses.filter(isCredit));
	const debits = sum(reportExpenses.filter((e) => !isCredit(e)));

	return {
		title,
		totals: { credits, debits, net: credits - debits },
		months,
		trendTotals: months.reduce(
			(totals, { trend }) => ({
				income: totals.income + trend.income.amount,
				credits: totals.credits + trend.credits,
				debits: totals.debits + trend.debits,
				potentialSavings: totals.potentialSavings + trend.potentialSavings,
			}),
			{ income: 0, credits: 0, debits: 0, potentialSavings: 0 },
		),
		balanceSeries: buildBalanceSeries(
			allExpenses,
			financeData?.currentBalance ?? 0,
			monthKey,
			today,
		),
		categoryTotals: groupExpensesByCategory(reportExpenses).slice(0, 8),
	};
};

/** "October 2026" for a "2026-10" key */
export const getMonthLabel = (monthKey: string): string =>
	parseISODate(`${monthKey}-01`).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});

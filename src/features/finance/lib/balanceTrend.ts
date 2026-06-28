import {
	formatISODate,
	parseISODate,
	generateDateRange,
} from "@src/lib/utils/isoDate";
import type { ExpenseEntry, Expense } from "@src/features/finance/type";

export interface BalanceTrendPoint {
	date: string;
	balance: number;
	credit: number;
	debit: number;
	netChange: number;
}

type TrendableExpense = Pick<
	Expense | ExpenseEntry,
	"date" | "amount" | "type"
>;

/**
 * Builds a daily balance-trend series for a given date range.
 * Shared by BalanceTrendChart (live UI) and the PDF export's
 * drawBalanceTrendChart, which previously reimplemented this
 * independently as buildBalanceTrendData.
 */
const buildBalanceTrend = (
	expenses: TrendableExpense[],
	initialBalance: number,
	range: { start: Date; end: Date },
): BalanceTrendPoint[] => {
	const dateRange = generateDateRange(range.start, range.end);

	const daily: Record<string, { credit: number; debit: number }> = {};
	dateRange.forEach((date) => {
		daily[date] = { credit: 0, debit: 0 };
	});

	expenses.forEach((expense) => {
		const bucket = daily[expense.date];
		if (!bucket) return;

		const amount =
			typeof expense.amount === "number" && !Number.isNaN(expense.amount)
				? expense.amount
				: 0;

		if (expense.type === "Cr") {
			bucket.credit += amount;
		} else {
			bucket.debit += amount;
		}
	});

	let running = initialBalance;
	return dateRange.map((date) => {
		const { credit, debit } = daily[date];
		const net = credit - debit;
		running += net;
		return { date, balance: running, credit, debit, netChange: net };
	});
};

/**
 * Convenience wrapper: derives the [start, end] range from the expense
 * list itself (earliest expense date through today, or today alone if
 * there are no expenses), then builds the trend. This matches the
 * default behavior BalanceTrendChart had inline.
 */
export const buildBalanceTrendForAllTime = (
	expenses: TrendableExpense[],
	initialBalance: number,
	fallbackDayCount: number,
): BalanceTrendPoint[] => {
	const today = new Date();
	const dates = expenses.map((expense) => parseISODate(expense.date));

	const start =
		dates.length > 0
			? new Date(Math.min(...dates.map((d) => d.getTime())))
			: new Date(
					today.getFullYear(),
					today.getMonth(),
					today.getDate() - (fallbackDayCount - 1),
				);

	const end =
		dates.length > 0
			? new Date(
					Math.max(today.getTime(), ...dates.map((d) => d.getTime())),
				)
			: today;

	return buildBalanceTrend(expenses, initialBalance, { start, end });
};

export { formatISODate, parseISODate };

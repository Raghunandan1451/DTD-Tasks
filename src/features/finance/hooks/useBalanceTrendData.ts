import { useMemo } from "react";
import { Expense } from "@src/features/finance/type";
import { buildBalanceTrendForAllTime } from "@src/features/finance/lib/balanceTrend";
import { computePaddedDomain } from "@src/features/finance/lib/chartDomain";
import { useVisibleDateRange } from "@src/features/finance/hooks/useVisibleDateRange";
import { summarizeFlatRuns } from "@src/features/finance/lib/summarizeFlatRuns";
import { regularIntervalTicks } from "@src/features/finance/lib/regularIntervalTicks";

const MIN_FLAT_RUN_TO_SUMMARIZE = 3;

const getLineColor = (balance: number, initialBalance: number) => {
	if (balance > initialBalance) return "#22c55e"; // green
	if (balance < initialBalance) return "#ef4444"; // red
	return "#3b82f6"; // blue
};

/**
 * All derived chart data for BalanceTrendChart: the full daily series,
 * the brush-selected visible window, the line color (relative to the
 * starting balance), the padded Y-axis domain, and a sparse set of
 * X-axis tick dates. Extracted so the component itself stays close to
 * pure JSX wiring.
 */
export const useBalanceTrendData = (
	expenses: Expense[],
	initialBalance: number,
	visibleDayCount: number,
) => {
	const dailyBalanceData = useMemo(
		() =>
			buildBalanceTrendForAllTime(
				expenses,
				initialBalance,
				visibleDayCount,
			),
		[expenses, initialBalance, visibleDayCount],
	);

	// Collapse long runs of no-activity days into a 2-point flat segment,
	// carrying the collapsed date range so the tooltip can say "no
	// activity from X to Y" instead of showing one tooltip per day.
	const balanceData = useMemo(
		() => summarizeFlatRuns(dailyBalanceData, MIN_FLAT_RUN_TO_SUMMARIZE),
		[dailyBalanceData],
	);

	// Defaults to the last `visibleDayCount` REAL calendar days, not the
	// last N entries -- summarizeFlatRuns can shrink a long flat run down
	// to 2 points, so "last N entries" of balanceData would no longer
	// mean "last N days" once summarization kicks in.
	const [range, setRange] = useVisibleDateRange(balanceData, visibleDayCount);

	const visibleData = useMemo(
		() => balanceData.slice(range.startIndex, range.endIndex + 1),
		[balanceData, range],
	);

	const currentBalance =
		visibleData[visibleData.length - 1]?.balance ?? initialBalance;
	const lineColor = getLineColor(currentBalance, initialBalance);

	const yDomain = useMemo(() => {
		const visibleBalances = visibleData.map((point) => point.balance);
		return computePaddedDomain([...visibleBalances, initialBalance]);
	}, [visibleData, initialBalance]);

	// Dots render on dates the balance actually changed, plus the
	// first/last day -- separate from X-axis tick LABELS below, which
	// now use a fixed ~6-day interval instead.
	const significantDates = useMemo(() => {
		const changedDates = balanceData
			.filter((point) => point.netChange !== 0 || point.summarizedRange)
			.map((point) => point.date);

		const first = balanceData[0]?.date;
		const last = balanceData[balanceData.length - 1]?.date;
		const dates = new Set(changedDates);
		if (first) dates.add(first);
		if (last) dates.add(last);

		return dates;
	}, [balanceData]);

	// Ticks at a regular ~6-day interval rather than only at change
	// points, computed over the VISIBLE window so they adapt when the
	// user zooms via the brush or a date-range preset.
	const dateAxisTicks = useMemo(
		() => regularIntervalTicks(visibleData),
		[visibleData],
	);

	return {
		balanceData,
		range,
		setRange,
		lineColor,
		yDomain,
		dateAxisTicks,
		significantDates,
	};
};

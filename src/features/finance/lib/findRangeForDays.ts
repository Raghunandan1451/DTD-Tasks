import { parseISODate } from "@src/features/finance/lib/balanceTrend";
import type { VisibleRange } from "@src/features/finance/hooks/useVisibleRange";

interface DatedPoint {
	date: string;
}

/**
 * Finds the {startIndex, endIndex} window covering the last `dayCount`
 * real calendar days, ending at the last point. Shared by
 * useVisibleDateRange (default window) and BalanceTrendDateFilter
 * (preset buttons), so both compute "last N days" the same way against
 * a possibly-summarized (collapsed flat-run) series.
 */
export const findRangeForDays = (
	points: DatedPoint[],
	dayCount: number,
): VisibleRange => {
	const endIndex = Math.max(points.length - 1, 0);
	if (points.length === 0) return { startIndex: 0, endIndex: 0 };

	const lastDate = parseISODate(points[endIndex].date);
	const cutoff = new Date(lastDate);
	cutoff.setDate(cutoff.getDate() - (dayCount - 1));

	// First point whose date is on/after the cutoff -- since points are
	// date-ordered, this is the earliest point within the window.
	const startIndex = points.findIndex(
		(point) => parseISODate(point.date) >= cutoff,
	);

	return { startIndex: startIndex === -1 ? 0 : startIndex, endIndex };
};

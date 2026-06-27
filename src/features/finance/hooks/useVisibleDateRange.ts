import { useEffect, useMemo, useState } from "react";
import type { VisibleRange } from "@src/features/finance/hooks/useVisibleRange";
import { findRangeForDays } from "@src/features/finance/lib/findRangeForDays";

interface DatedPoint {
	date: string;
}

/**
 * Like useVisibleRange, but the default window is based on real
 * elapsed calendar days rather than array entry count. Needed because
 * summarizeFlatRuns.ts can collapse a long flat run down to 2 points --
 * "last N entries" of that shrunk array no longer corresponds to "last
 * N calendar days."
 */
export const useVisibleDateRange = (
	points: DatedPoint[],
	visibleDayCount: number,
): [VisibleRange, (range: VisibleRange) => void] => {
	const defaultRange = useMemo(
		() => findRangeForDays(points, visibleDayCount),
		[points, visibleDayCount],
	);

	const [range, setRange] = useState<VisibleRange>(defaultRange);

	useEffect(() => {
		setRange(defaultRange);
	}, [defaultRange]);

	return [range, setRange];
};

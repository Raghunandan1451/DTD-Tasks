import { useEffect, useMemo, useState } from "react";

export interface VisibleRange {
	startIndex: number;
	endIndex: number;
}

/**
 * Manages the visible window (recharts Brush range) over a dataset of
 * a given length, defaulting to showing the last `visibleCount` items.
 * Resets to that default whenever the dataset length changes (e.g. new
 * expenses loaded), matching BalanceTrendChart's previous behavior.
 */
export const useVisibleRange = (
	dataLength: number,
	visibleCount: number
): [VisibleRange, (range: VisibleRange) => void] => {
	const defaultRange = useMemo<VisibleRange>(() => {
		const endIndex = Math.max(dataLength - 1, 0);
		const startIndex = Math.max(endIndex - (visibleCount - 1), 0);
		return { startIndex, endIndex };
	}, [dataLength, visibleCount]);

	const [range, setRange] = useState<VisibleRange>(defaultRange);

	useEffect(() => {
		setRange(defaultRange);
	}, [defaultRange]);

	return [range, setRange];
};

import type { BalanceTrendPoint } from "@src/features/finance/lib/balanceTrend";

export interface SummarizedPoint extends BalanceTrendPoint {
	/** Present only on collapsed flat-run boundary points; absent on normal days. */
	summarizedRange?: { start: string; end: string };
}

/**
 * Collapses consecutive no-activity days (netChange === 0) into a
 * 2-point flat segment (range start + range end), so a long flat
 * stretch doesn't need one rendered point per day to look flat.
 * Runs shorter than `minRunLength` are left alone -- a 1-2 day flat
 * stretch doesn't need summarizing, there's nothing to compress.
 */
export const summarizeFlatRuns = (
	points: BalanceTrendPoint[],
	minRunLength: number = 3,
): SummarizedPoint[] => {
	const result: SummarizedPoint[] = [];
	let i = 0;

	while (i < points.length) {
		const point = points[i];

		// Always keep the very first point and any day with real activity as-is.
		if (i === 0 || point.netChange !== 0) {
			result.push(point);
			i++;
			continue;
		}

		// Find how far this flat run (netChange === 0) extends.
		let runEnd = i;
		while (
			runEnd + 1 < points.length &&
			points[runEnd + 1].netChange === 0
		) {
			runEnd++;
		}
		const runLength = runEnd - i + 1;

		if (runLength < minRunLength) {
			// Too short to bother summarizing -- keep every day as-is.
			for (let j = i; j <= runEnd; j++) result.push(points[j]);
		} else {
			const rangeStartPoint = points[i];
			const rangeEndPoint = points[runEnd];
			const range = {
				start: rangeStartPoint.date,
				end: rangeEndPoint.date,
			};

			result.push({ ...rangeStartPoint, summarizedRange: range });
			result.push({ ...rangeEndPoint, summarizedRange: range });
		}

		i = runEnd + 1;
	}

	return result;
};

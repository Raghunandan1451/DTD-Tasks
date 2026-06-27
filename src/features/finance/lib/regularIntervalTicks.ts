import { parseISODate } from "@src/features/finance/lib/balanceTrend";

interface DatedPoint {
	date: string;
}

const TARGET_GAP_DAYS = 6; // midpoint of the requested 5-7 day spacing

/**
 * Picks X-axis tick dates at a roughly regular interval (~6 real days
 * apart) rather than only at dates where the balance changed. Walks
 * points in date order and emits a tick whenever enough real time has
 * elapsed since the last one -- this stays correct even though
 * summarizeFlatRuns.ts can collapse a long flat run down to 2 points,
 * since it's driven by actual date gaps, not array position.
 */
export const regularIntervalTicks = (points: DatedPoint[]): string[] => {
	if (points.length === 0) return [];

	const ticks: string[] = [points[0].date];
	let lastTickDate = parseISODate(points[0].date);

	for (let i = 1; i < points.length - 1; i++) {
		const pointDate = parseISODate(points[i].date);
		const daysSinceLastTick =
			(pointDate.getTime() - lastTickDate.getTime()) / 86_400_000;

		if (daysSinceLastTick >= TARGET_GAP_DAYS) {
			ticks.push(points[i].date);
			lastTickDate = pointDate;
		}
	}

	const lastDate = points[points.length - 1].date;
	if (lastDate !== ticks[ticks.length - 1]) {
		ticks.push(lastDate);
	}

	return ticks;
};

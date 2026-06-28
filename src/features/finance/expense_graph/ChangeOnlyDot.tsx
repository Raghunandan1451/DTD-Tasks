import { DotProps } from "recharts";

interface BalancePointPayload {
	date: string;
}

/**
 * Custom dot renderer for the balance Line: only draws a visible dot on
 * dates in `significantDates` (where the balance actually changed, plus
 * the first/last day). Every other day still has a real data point in
 * the series for correct line spacing/slope and hover/brush behavior --
 * this only affects which points get a *visible* marker.
 */
export const createChangeOnlyDot = (
	significantDates: Set<string>,
	color: string,
) => {
	return (props: DotProps & { payload?: BalancePointPayload }) => {
		const { cx, cy, payload } = props;
		if (cx === undefined || cy === undefined || !payload) return <></>;
		if (!significantDates.has(payload.date)) return <></>;

		return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />;
	};
};

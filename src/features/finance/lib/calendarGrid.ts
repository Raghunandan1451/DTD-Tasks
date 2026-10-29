import {
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { formatISODate } from "@src/lib/utils/isoDate";

export interface CalendarDay {
	/** Local YYYY-MM-DD */
	iso: string;
	/** Day of month (1-31) */
	day: number;
	/** False for the leading/trailing days that pad the first and last week */
	inMonth: boolean;
}

export const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Builds the month as Monday-first weeks of 7 days, padded with neighbouring days. */
export const buildMonthGrid = (month: Date): CalendarDay[][] => {
	const monthStart = startOfMonth(month);
	const days = eachDayOfInterval({
		start: startOfWeek(monthStart, { weekStartsOn: 1 }),
		end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
	}).map((date) => ({
		iso: formatISODate(date),
		day: date.getDate(),
		inMonth: date.getMonth() === monthStart.getMonth(),
	}));

	const weeks: CalendarDay[][] = [];
	for (let i = 0; i < days.length; i += 7) {
		weeks.push(days.slice(i, i + 7));
	}
	return weeks;
};

/** Compact amount for tight calendar cells: 950, 1.2k, 15k. */
export const formatCompactAmount = (amount: number): string => {
	if (amount < 1000) return `${Math.round(amount)}`;
	const thousands = amount / 1000;
	return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}k`;
};

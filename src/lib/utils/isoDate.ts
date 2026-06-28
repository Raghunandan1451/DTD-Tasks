/**
 * Shared date helpers for finance features. Previously duplicated
 * verbatim in BalanceTrendChart.tsx and downloadHandler.ts.
 */

/** Formats a Date as a local YYYY-MM-DD string (not UTC — avoids timezone day-shift bugs). */
export const formatISODate = (date: Date): string => {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
};

/** Parses a YYYY-MM-DD string into a local-midnight Date (avoids UTC parsing shifting the day). */
export const parseISODate = (date: string): Date => {
	return new Date(`${date}T00:00:00`);
};

/** Generates every YYYY-MM-DD date string from start to end, inclusive. */
export const generateDateRange = (start: Date, end: Date): string[] => {
	const dates: string[] = [];
	const current = new Date(start);

	while (current <= end) {
		dates.push(formatISODate(current));
		current.setDate(current.getDate() + 1);
	}

	return dates;
};

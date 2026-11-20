/** What a finance PDF covers. "allMonths" and "lastTwoMonths" are the older choices. */
export type ReportPeriod =
	| { kind: "month"; month: string } // "yyyy-MM"
	| { kind: "quarter"; year: number; quarter: 1 | 2 | 3 | 4 }
	| { kind: "year"; year: number };

const pad = (n: number): string => String(n).padStart(2, "0");

export const monthKeyOf = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export const quarterOf = (date: Date): 1 | 2 | 3 | 4 => (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;

/** The period "right now" for each kind: the default choices in the export dialog. */
export const currentPeriods = (today: Date = new Date()) => ({
	month: { kind: "month", month: monthKeyOf(today) } as ReportPeriod,
	quarter: { kind: "quarter", year: today.getFullYear(), quarter: quarterOf(today) } as ReportPeriod,
	year: { kind: "year", year: today.getFullYear() } as ReportPeriod,
});

/** The "yyyy-MM" keys the period covers, oldest first. */
export const monthsOfPeriod = (period: ReportPeriod): string[] => {
	if (period.kind === "month") return [period.month];
	if (period.kind === "year") return Array.from({ length: 12 }, (_, i) => `${period.year}-${pad(i + 1)}`);
	const first = (period.quarter - 1) * 3 + 1;
	return [0, 1, 2].map((i) => `${period.year}-${pad(first + i)}`);
};

/** "Q4 2026", "2026", or the month name for a month. */
export const periodLabel = (period: ReportPeriod, monthLabel: (key: string) => string): string => {
	if (period.kind === "month") return monthLabel(period.month);
	if (period.kind === "quarter") return `Q${period.quarter} ${period.year}`;
	return String(period.year);
};

export const periodFileName = (period: ReportPeriod): string => {
	if (period.kind === "month") return `expenses-report-${period.month}.pdf`;
	if (period.kind === "quarter") return `expenses-report-${period.year}-Q${period.quarter}.pdf`;
	return `expenses-report-${period.year}.pdf`;
};

/** A period from untrusted form input, or null when it is not valid. */
export const parsePeriod = (kind: ReportPeriod["kind"], input: { month?: string; year?: number; quarter?: number }): ReportPeriod | null => {
	if (kind === "month") {
		return input.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(input.month) ? { kind, month: input.month } : null;
	}
	const year = input.year;
	if (!year || !Number.isInteger(year) || year < 1970 || year > 9999) return null;
	if (kind === "year") return { kind, year };
	const quarter = input.quarter;
	return quarter && [1, 2, 3, 4].includes(quarter) ? { kind, year, quarter: quarter as 1 | 2 | 3 | 4 } : null;
};

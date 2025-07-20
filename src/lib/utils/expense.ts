import { TimeUnit } from "@src/lib/types/expense";

export function getDailyEquivalent(
	amount: number,
	unit: TimeUnit,
	date: string
): number {
	const yearDays = daysInYear(date);
	const monthDays = daysInMonth(date);

	switch (unit) {
		case "yearly":
			return amount / yearDays;
		case "semiannual":
			return amount / (yearDays / 2);
		case "quarterly":
			return amount / (yearDays / 4);
		case "monthly":
			return amount / monthDays;
		case "weekly":
			return amount / 7;
		case "daily":
		default:
			return amount;
	}
}

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInYear(date: string | Date): number {
	const year = new Date(date).getFullYear();
	return isLeapYear(year) ? 366 : 365;
}

function daysInMonth(date: string | Date): number {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = d.getMonth(); // 0-indexed
	return new Date(year, month + 1, 0).getDate();
}

export function simulateImpact(
	existingDailyTotal: number,
	simulatedExpense: number,
	frequency: TimeUnit
) {
	const added = getDailyEquivalent(
		simulatedExpense,
		frequency,
		new Date().toISOString()
	);
	return existingDailyTotal + added;
}

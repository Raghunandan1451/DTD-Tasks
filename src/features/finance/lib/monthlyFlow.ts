import { addMonths, format, startOfMonth } from "date-fns";
import type { ExpenseEntry, SalaryHistoryEntry } from "@src/features/finance/type";
import {
	getSalaryForMonth,
	resolveMonthlyIncome,
} from "@src/features/finance/budget_planning/lib/savingsCalculations";

export interface MonthFlow {
	/** "yyyy-MM" */
	month: string;
	label: string;
	income: number;
	spent: number;
	/** income - spent; negative means savings were used */
	saved: number;
	/** True when income was taken from the current salary because none was recorded */
	estimated: boolean;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const monthlySpent = (expenses: readonly ExpenseEntry[], month: string): number =>
	round(
		expenses
			.filter((e) => e.type !== "Cr" && e.group !== "Salary" && e.date.startsWith(month))
			.reduce((sum, e) => sum + e.amount, 0),
	);

/** Income, spend and savings for each of the `count` months ending at `end`. */
export const buildMonthlyFlow = (
	expenses: readonly ExpenseEntry[],
	salaryHistory: SalaryHistoryEntry[] | undefined,
	currentSalary: number,
	end: Date = new Date(),
	count = 12,
): MonthFlow[] => {
	const last = startOfMonth(end);
	const flows: MonthFlow[] = [];
	for (let back = count - 1; back >= 0; back--) {
		const date = addMonths(last, -back);
		const month = format(date, "yyyy-MM");
		const income = resolveMonthlyIncome(
			month,
			expenses as ExpenseEntry[],
			getSalaryForMonth(month, salaryHistory, currentSalary),
		);
		const spent = monthlySpent(expenses, month);
		flows.push({
			month,
			label: format(date, "MMM yy"),
			income: round(income.amount),
			spent,
			saved: round(income.amount - spent),
			estimated: income.isEstimated,
		});
	}
	return flows;
};

import { formatISODate } from "@src/lib/utils/isoDate";
import type {
	BudgetCategory,
	ExpenseEntry,
	RecurringItem,
	SalaryHistoryEntry,
} from "@src/features/finance/type";
import {
	getAssignedExpenseIds,
	getDefaultCategories,
	getMonthlyDebitExpenses,
	isSavingsCategory,
} from "@src/features/finance/budget_planning/lib/budgetPlanUtils";
import {
	getCategoryAllocation,
	getCategorySpent,
	getSalaryForMonth,
	resolveMonthlyIncome,
} from "@src/features/finance/budget_planning/lib/savingsCalculations";
import { unpostedAmountInYear } from "@src/features/finance/lib/recurring";

export interface YearlyCategoryRow {
	/** Lower-cased name, used to merge the same category across months */
	key: string;
	name: string;
	planned: number;
	spent: number;
	/** planned - spent; negative = overspent */
	difference: number;
}

export interface YearlyTotals {
	year: number;
	/** Money in: real salary and credits for past months, current salary for the rest */
	income: number;
	/** Part of `income` that is an estimate from the current salary */
	estimatedIncome: number;
	/** Everything spent so far this year (debits, no salary) */
	spent: number;
	/** Recurring payments due later in the year that are not in the list yet */
	upcomingRecurring: number;
	/** spent + upcomingRecurring */
	projectedSpend: number;
	/** Set aside by the plan (the Savings category) */
	plannedSavings: number;
	/** income - projectedSpend; negative = spending beats income */
	result: number;
	/** How much of a shortfall comes out of savings (0 when income covers spend) */
	coveredFromSavings: number;
	/** Months (yyyy-MM) where spending went past that month's income */
	overspentMonths: string[];
	rows: YearlyCategoryRow[];
	/** Debits not linked to any budget category */
	unassigned: number;
}

interface YearlyInput {
	year: number;
	expenses: ExpenseEntry[];
	salaryHistory?: SalaryHistoryEntry[];
	/** Current salary, for months with no salary credit */
	currentSalary: number;
	plansByMonth?: Record<string, BudgetCategory[]>;
	legacyCategories?: BudgetCategory[];
	recurring?: RecurringItem[];
	today?: Date;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Whole-year totals: income vs spend, planned vs spent per category, and how
 * much of any shortfall has to come from savings. Pure; no store access.
 */
export const buildYearlyTotals = ({
	year,
	expenses,
	salaryHistory,
	currentSalary,
	plansByMonth = {},
	legacyCategories,
	recurring = [],
	today = new Date(),
}: YearlyInput): YearlyTotals => {
	const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
	const rowsByKey = new Map<string, YearlyCategoryRow>();
	let income = 0;
	let estimatedIncome = 0;
	let spent = 0;
	let plannedSavings = 0;
	let unassigned = 0;
	const overspentMonths: string[] = [];

	for (let m = 1; m <= 12; m++) {
		const month = `${year}-${String(m).padStart(2, "0")}`;
		const salary = getSalaryForMonth(month, salaryHistory, currentSalary);
		const isFuture = month > currentMonth;
		const monthIncome = isFuture
			? { amount: salary, isEstimated: true }
			: resolveMonthlyIncome(month, expenses, salary);
		income += monthIncome.amount;
		if (monthIncome.isEstimated) estimatedIncome += monthIncome.amount;

		const debits = getMonthlyDebitExpenses(expenses, month);
		const monthSpent = debits.reduce((sum, e) => sum + e.amount, 0);
		spent += monthSpent;
		if (!isFuture && monthIncome.amount > 0 && monthSpent > monthIncome.amount) {
			overspentMonths.push(month);
		}

		const categories = plansByMonth[month] ?? getDefaultCategories(legacyCategories, month);
		for (const category of categories) {
			const planned = getCategoryAllocation(category, monthIncome.amount);
			if (isSavingsCategory(category)) {
				plannedSavings += planned;
				continue;
			}
			const key = category.name.trim().toLowerCase();
			const row = rowsByKey.get(key) ?? {
				key,
				name: category.name.trim() || "Unnamed",
				planned: 0,
				spent: 0,
				difference: 0,
			};
			row.planned += planned;
			row.spent += getCategorySpent(category, debits);
			rowsByKey.set(key, row);
		}
		const assigned = getAssignedExpenseIds(categories);
		unassigned += debits
			.filter((expense) => !assigned.has(expense.id))
			.reduce((sum, e) => sum + e.amount, 0);
	}

	const todayIso = formatISODate(today);
	const upcomingRecurring = recurring.reduce(
		(sum, item) => sum + unpostedAmountInYear(item, year, todayIso),
		0,
	);
	const projectedSpend = spent + upcomingRecurring;
	const result = income - projectedSpend;

	const rows = [...rowsByKey.values()].map((row) => ({
		...row,
		planned: round2(row.planned),
		spent: round2(row.spent),
		difference: round2(row.planned - row.spent),
	}));

	return {
		year,
		income: round2(income),
		estimatedIncome: round2(estimatedIncome),
		spent: round2(spent),
		upcomingRecurring: round2(upcomingRecurring),
		projectedSpend: round2(projectedSpend),
		plannedSavings: round2(plannedSavings),
		result: round2(result),
		coveredFromSavings: round2(Math.max(0, -result)),
		overspentMonths,
		rows,
		unassigned: round2(unassigned),
	};
};

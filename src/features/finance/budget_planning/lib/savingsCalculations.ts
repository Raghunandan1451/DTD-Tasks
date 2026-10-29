import { format } from "date-fns";
import {
	BudgetCategory,
	BudgetExpense,
	ExpenseEntry,
	SalaryHistoryEntry,
} from "@src/features/finance/type";
import {
	AUTO_SAVINGS_PREFIX,
	getAssignedExpenseIds,
	getDefaultCategories,
	getMonthlyDebitExpenses,
	isAutoSavingsEntry,
	isSavingsCategory,
	resolveBudgetExpense,
} from "@src/features/finance/budget_planning/lib/budgetPlanUtils";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

const round2 = (value: number): number =>
	Math.round((value + Number.EPSILON) * 100) / 100;

export interface MonthlyIncome {
	amount: number;
	/** True when no salary credit exists for the month and the current salary was used */
	isEstimated: boolean;
}

export interface CategoryBalance {
	categoryId: string;
	name: string;
	allocation: number;
	spent: number;
	balance: number;
}

export interface PotentialSavings {
	total: number;
	savingsAllocation: number;
	breakdown: CategoryBalance[];
	/** Month debits not linked to any category; excluded from the total */
	unassignedSpend: number;
}

const getCategoryAllocation = (
	category: BudgetCategory,
	income: number,
): number => (income * category.percentage) / 100;

/** Spend linked to a category. Synthetic savings snapshots are never spend. */
const getCategorySpent = (
	category: BudgetCategory,
	monthlyExpenses: ExpenseEntry[],
): number =>
	(category.expenses ?? [])
		.filter((budgetExpense) => !isAutoSavingsEntry(budgetExpense))
		.reduce(
			(sum, budgetExpense) =>
				sum + resolveBudgetExpense(budgetExpense, monthlyExpenses).amount,
			0,
		);

/** Salary in effect for a month, so a later raise doesn't change earlier months */
export const getSalaryForMonth = (
	month: string,
	history: SalaryHistoryEntry[] | undefined,
	currentSalary: number,
): number => {
	const applicable = (history ?? [])
		.filter((entry) => entry.from <= month)
		.sort((a, b) => a.from.localeCompare(b.from));
	return applicable.length > 0
		? applicable[applicable.length - 1].amount
		: currentSalary;
};

const sumAmounts = (entries: ExpenseEntry[]): number =>
	entries.reduce((sum, entry) => sum + entry.amount, 0);

/**
 * Income for a month: its Salary credits plus every other credit the user
 * added by hand (bonus, refund, freelance...). The salary part falls back to
 * the current salary, flagged as estimated, when no Salary credit was
 * recorded; extra credits are always real, so they never count as estimated.
 */
export const resolveMonthlyIncome = (
	month: string,
	expenses: ExpenseEntry[],
	fallbackSalary: number,
): MonthlyIncome => {
	const credits = expenses.filter(
		(expense) => expense.date.startsWith(month) && expense.type === "Cr",
	);
	const salaryCredits = credits.filter((credit) => credit.group === "Salary");
	const extraCredits = credits.filter((credit) => credit.group !== "Salary");

	const isEstimated = salaryCredits.length === 0;
	const salary = isEstimated ? fallbackSalary : sumAmounts(salaryCredits);
	return { amount: salary + sumAmounts(extraCredits), isEstimated };
};

/**
 * Potential Savings = Savings allocation + sum over every other category of
 * (allocation - linked spend). Balances are intentionally not clamped, so an
 * overspent category offsets surpluses elsewhere.
 */
export const calculatePotentialSavings = ({
	categories,
	income,
	monthlyExpenses,
}: {
	categories: BudgetCategory[];
	income: number;
	monthlyExpenses: ExpenseEntry[];
}): PotentialSavings => {
	let savingsAllocation = 0;
	const breakdown: CategoryBalance[] = [];

	for (const category of categories) {
		const allocation = getCategoryAllocation(category, income);
		if (isSavingsCategory(category)) {
			savingsAllocation += allocation;
			continue;
		}
		const spent = getCategorySpent(category, monthlyExpenses);
		breakdown.push({
			categoryId: category.id,
			name: category.name,
			allocation,
			spent,
			balance: allocation - spent,
		});
	}

	const assignedIds = getAssignedExpenseIds(categories);
	const unassignedSpend = monthlyExpenses
		.filter((expense) => !assignedIds.has(expense.id))
		.reduce((sum, expense) => sum + expense.amount, 0);

	return {
		total: round2(
			savingsAllocation +
				breakdown.reduce((sum, item) => sum + item.balance, 0),
		),
		savingsAllocation,
		breakdown,
		unassignedSpend,
	};
};

/**
 * Past months with recorded activity: a saved plan, or at least one debit.
 * Derived from the data, so no start month is assumed. Months that only hold
 * salary credits are not treated as tracked months.
 */
export const getEligibleSnapshotMonths = ({
	plansByMonth,
	expenses,
	today,
}: {
	plansByMonth: Record<string, BudgetCategory[]>;
	expenses: ExpenseEntry[];
	today: Date;
}): string[] => {
	const currentMonth = format(today, "yyyy-MM");
	const months = new Set<string>(Object.keys(plansByMonth));
	for (const expense of expenses) {
		if (expense.type !== "Cr" && expense.group !== "Salary") {
			months.add(expense.date.slice(0, 7));
		}
	}
	return [...months]
		.filter((month) => MONTH_PATTERN.test(month) && month < currentMonth)
		.sort();
};

export const buildSnapshotEntry = (
	month: string,
	amount: number,
	isEstimated: boolean,
): BudgetExpense => ({
	id: `${AUTO_SAVINGS_PREFIX}${month}`,
	name: `${format(new Date(`${month}-01T12:00:00`), "MMMM yyyy")} Savings`,
	amount: round2(amount),
	...(isEstimated ? { isEstimated: true } : {}),
});

/** Replaces the snapshot with the same id in place (or appends it), dropping duplicates */
export const upsertSnapshot = (
	categories: BudgetCategory[],
	entry: BudgetExpense,
): BudgetCategory[] => {
	let applied = false;
	return categories.map((category) => {
		if (applied || !isSavingsCategory(category)) return category;
		applied = true;

		const existing = category.expenses ?? [];
		const firstIndex = existing.findIndex(
			(budgetExpense) => budgetExpense.id === entry.id,
		);
		const expenses =
			firstIndex === -1
				? [...existing, entry]
				: existing.flatMap((budgetExpense, index) => {
						if (budgetExpense.id !== entry.id) return [budgetExpense];
						return index === firstIndex ? [entry] : [];
					});
		return { ...category, expenses };
	});
};

const isSnapshotCurrent = (
	categories: BudgetCategory[],
	entry: BudgetExpense,
): boolean => {
	const savingsCategory = categories.find(isSavingsCategory);
	const matches = (savingsCategory?.expenses ?? []).filter(
		(budgetExpense) => budgetExpense.id === entry.id,
	);
	return (
		matches.length === 1 &&
		matches[0].amount === entry.amount &&
		matches[0].name === entry.name &&
		Boolean(matches[0].isEstimated) === Boolean(entry.isEstimated)
	);
};

/**
 * Computes the snapshot for every eligible past month and returns only the
 * month plans that must change. Idempotent: a second run over its own output
 * returns an empty object.
 */
export const reconcileSavingsSnapshots = ({
	plansByMonth,
	legacyCategories,
	expenses,
	fallbackSalary,
	salaryHistory,
	today,
}: {
	plansByMonth: Record<string, BudgetCategory[]>;
	legacyCategories?: BudgetCategory[];
	expenses: ExpenseEntry[];
	fallbackSalary: number;
	salaryHistory?: SalaryHistoryEntry[];
	today: Date;
}): Record<string, BudgetCategory[]> => {
	const changes: Record<string, BudgetCategory[]> = {};

	for (const month of getEligibleSnapshotMonths({
		plansByMonth,
		expenses,
		today,
	})) {
		const savedPlan = plansByMonth[month];
		const categories =
			savedPlan ?? getDefaultCategories(legacyCategories, month);
		if (!categories.some(isSavingsCategory)) continue;

		const income = resolveMonthlyIncome(
			month,
			expenses,
			getSalaryForMonth(month, salaryHistory, fallbackSalary),
		);
		if (income.amount <= 0) continue;

		const { total } = calculatePotentialSavings({
			categories,
			income: income.amount,
			monthlyExpenses: getMonthlyDebitExpenses(expenses, month),
		});
		const entry = buildSnapshotEntry(month, total, income.isEstimated);

		if (savedPlan && isSnapshotCurrent(savedPlan, entry)) continue;
		changes[month] = upsertSnapshot(categories, entry);
	}

	return changes;
};

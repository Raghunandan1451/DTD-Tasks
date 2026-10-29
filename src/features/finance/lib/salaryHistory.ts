import { SalaryHistoryEntry } from "@src/features/finance/type";

/**
 * Returns the salary history after the amount changed in `month` ("yyyy-MM").
 * Months before the first recorded change keep the original amount, so the
 * first change seeds a baseline entry from the previous amount.
 */
export const recordSalaryChange = (
	history: SalaryHistoryEntry[] | undefined,
	previousAmount: number,
	nextAmount: number,
	month: string,
): SalaryHistoryEntry[] => {
	const entries = history?.length
		? history.map((entry) => ({ ...entry }))
		: [{ from: "0000-00", amount: previousAmount }];

	const thisMonth = entries.find((entry) => entry.from === month);
	if (thisMonth) thisMonth.amount = nextAmount;
	else entries.push({ from: month, amount: nextAmount });

	return entries;
};

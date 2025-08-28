// import { TimeUnit } from "@src/lib/types/finance";

import { FinanceState } from "@src/lib/types/finance";
import { AppDispatch } from "@src/lib/store/store";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";

interface FinanceFormValues {
	amount: string;
	day: string;
	balance: string;
}
export const validateFinanceSetup = ({
	amount,
	day,
	balance,
}: FinanceFormValues): { success: boolean; message: string } => {
	console.log(amount, day, balance);
	if (!amount || parseFloat(amount) <= 0) {
		return {
			success: false,
			message: "Salary amount must be greater than 0.",
		};
	}

	const dayVal = parseInt(day);
	if (!day || dayVal < 1 || dayVal > 31) {
		return {
			success: false,
			message: "Day of month must be between 1 and 31.",
		};
	}

	if (!balance || isNaN(parseFloat(balance))) {
		return { success: false, message: "Current balance is required." };
	}

	return { success: true, message: "Finance setup is valid." };
};

export function computeAutoUpdatedBalance(
	finance: FinanceState
): FinanceState | null {
	const today = new Date();
	const todayDate = today.getDate();

	// Check basic requirements
	if (!finance.salary?.amount || !finance.salary.dayOfMonth) return null;

	// Only update on or after salary day
	if (todayDate < finance.salary.dayOfMonth) return null;

	const lastUpdate = finance.lastUpdatedDate
		? new Date(finance.lastUpdatedDate)
		: null;

	// If never updated, set to 1 month
	let monthsPassed = 1;

	if (lastUpdate) {
		const yearDiff = today.getFullYear() - lastUpdate.getFullYear();
		const monthDiff = today.getMonth() - lastUpdate.getMonth();
		monthsPassed = yearDiff * 12 + monthDiff;

		// If already updated this month or not enough time has passed
		if (monthsPassed < 1) return null;
	}

	const todayISO = today.toISOString().split("T")[0];

	return {
		...finance,
		currentBalance:
			finance.currentBalance + finance.salary.amount * monthsPassed,
		lastUpdatedDate: todayISO,
	};
}

export function autoUpdateBalance(
	finance: FinanceState,
	dispatch: AppDispatch
) {
	const updated = computeAutoUpdatedBalance(finance);
	if (updated) {
		dispatch(setFinanceState(updated));
	}
}

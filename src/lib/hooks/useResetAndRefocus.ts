import { useCallback, useRef } from "react";

const REFOCUS_DELAY_MS = 50;

/**
 * Resets form state to a blank/initial value and refocuses the first
 * field shortly after, so the user can keep adding entries without
 * reaching for the mouse. Extracted from the duplicated reset+refocus
 * block in BudgetSimulatorForm.tsx and ExpenseEntryForm.tsx.
 */
export const useResetAndRefocus = <T,>(blankForm: T) => {
	const firstFieldRef = useRef<HTMLInputElement | null>(null);

	const resetAndRefocus = useCallback(
		(setForm: (value: T) => void) => {
			setForm(blankForm);
			setTimeout(() => {
				firstFieldRef.current?.focus();
			}, REFOCUS_DELAY_MS);
		},
		[blankForm]
	);

	return { firstFieldRef, resetAndRefocus };
};

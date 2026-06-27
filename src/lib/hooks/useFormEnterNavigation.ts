import { useCallback } from "react";

/**
 * Handles Enter (advance to next field) and Shift+Enter (go back to
 * previous field) within a form, skipping disabled controls.
 *
 * Extracted from BudgetSimulatorForm.tsx and ExpenseEntryForm.tsx,
 * which had this exact ~20-line handler duplicated verbatim.
 */
export const useFormEnterNavigation = () => {
	return useCallback((e: React.KeyboardEvent<HTMLElement>) => {
		if (e.key !== "Enter") return;

		e.preventDefault();
		const container = e.currentTarget.closest("form");
		if (!container) return;

		const focusable = Array.from(
			container.querySelectorAll<HTMLElement>("input, select, button")
		).filter((el) => !el.hasAttribute("disabled"));

		const currentIndex = focusable.indexOf(e.currentTarget as HTMLElement);
		if (currentIndex === -1) return;

		if (e.shiftKey) {
			focusable[currentIndex - 1]?.focus();
		} else {
			focusable[currentIndex + 1]?.focus();
		}
	}, []);
};

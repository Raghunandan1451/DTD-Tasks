import { useCallback } from "react";

/**
 * Handles Enter (advance to next field) and Shift+Enter (go back to
 * previous field) within a form, skipping disabled controls.
 *
 * Extracted from ExpenseEntryForm.tsx, which previously had this
 * handler duplicated inline.
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

import { useEffect, RefObject } from "react";

/**
 * Enter (advance to next field, or save on the last one) and Escape
 * (cancel) handling within a single editable table row. Sibling to
 * useFormEnterNavigation, but scoped to one row's inputs rather than
 * a whole form. Extracted from useExpenseTable.ts.
 */
export const useEditRowKeyNavigation = (
	editingId: string | null,
	editRowRef: RefObject<HTMLTableRowElement | null>,
	onSave: () => void,
	onCancel: () => void
) => {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const editRow = editRowRef.current;
			if (editRow) {
				const inputs = Array.from(
					editRow.querySelectorAll<HTMLElement>("input, select")
				).filter((el) => !el.hasAttribute("disabled"));
				const currentIndex = inputs.indexOf(e.currentTarget as HTMLElement);
				if (currentIndex < inputs.length - 1) {
					inputs[currentIndex + 1].focus();
				} else {
					onSave();
				}
			}
		}
		if (e.key === "Escape") {
			onCancel();
		}
	};

	useEffect(() => {
		if (editingId && editRowRef.current) {
			const firstInput = editRowRef.current.querySelector<HTMLInputElement>("input");
			if (firstInput) {
				setTimeout(() => firstInput.focus(), 50);
			}
		}
	}, [editingId, editRowRef]);

	return handleKeyDown;
};

import { useConfirmationModal } from "@src/lib/hooks/useConfirmDialog";
import { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";

/**
 * Confirmation-dialog-wrapped delete/remove handlers, shared by the
 * expense table (which has "protected" auto-generated rows) and the
 * budget simulator table (which doesn't). Extracted from
 * useExpenseTable.ts.
 */
export const useConfirmedDelete = (
	onDelete: (id: string) => void,
	showNotification?: ShowNotificationFn
) => {
	const confirmationModal = useConfirmationModal();

	const handleDelete = async (id: string, name: string, isProtected?: boolean) => {
		if (isProtected) {
			showNotification?.(
				"Auto-generated salary entries cannot be deleted. Update your salary settings instead.",
				"info"
			);
			return;
		}

		const confirmed = await confirmationModal.confirm({
			title: "Delete Expense",
			message: "Are you sure you want to delete this expense? This action cannot be undone.",
			itemName: name,
			confirmText: "Delete",
			cancelText: "Cancel",
			type: "danger",
		});

		if (confirmed) onDelete(id);
	};

	/** Used by the Budget Simulator table, which has no "protected" rows. */
	const handleRemoveItem = async (id: string, name?: string) => {
		const confirmed = await confirmationModal.confirm({
			title: "Remove Item",
			message: "Are you sure you want to remove this item from the simulation?",
			itemName: name,
			confirmText: "Remove",
			cancelText: "Cancel",
			type: "danger",
		});

		if (confirmed) onDelete(id);
	};

	return { confirmationModal, handleDelete, handleRemoveItem };
};

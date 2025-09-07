import { useState } from "react";
import { ConfirmationOptions } from "@src/components/shared/dialog/ConfirmModal";

export const useConfirmationModal = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [options, setOptions] = useState<ConfirmationOptions>({
		message: "",
	});
	const [resolvePromise, setResolvePromise] = useState<
		((value: boolean) => void) | null
	>(null);

	const confirm = (confirmOptions: ConfirmationOptions): Promise<boolean> => {
		return new Promise((resolve) => {
			setOptions(confirmOptions);
			setResolvePromise(() => resolve);
			setIsOpen(true);
		});
	};

	const handleConfirm = () => {
		if (resolvePromise) {
			resolvePromise(true);
		}
		setIsOpen(false);
		setResolvePromise(null);
	};

	const handleCancel = () => {
		if (resolvePromise) {
			resolvePromise(false);
		}
		setIsOpen(false);
		setResolvePromise(null);
	};

	return {
		isOpen,
		options,
		confirm,
		handleConfirm,
		handleCancel,
	};
};

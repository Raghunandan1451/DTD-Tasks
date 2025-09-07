import React, { useEffect } from "react";

// Types for the confirmation modal
export interface ConfirmationOptions {
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	type?: "danger" | "warning" | "info";
	itemName?: string;
}

// Reusable Confirmation Modal Component
interface ConfirmationModalProps {
	isOpen: boolean;
	options: ConfirmationOptions;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
	isOpen,
	options,
	onConfirm,
	onCancel,
}) => {
	// Handle escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onCancel]);

	if (!isOpen) return null;

	const getTypeStyles = () => {
		switch (options.type) {
			case "danger":
				return {
					confirmButtonClass:
						"bg-red-500 hover:bg-red-600 text-white focus:ring-red-300",
					titleClass: "text-red-600 dark:text-red-400",
					iconBg: "bg-red-100 dark:bg-red-900/30",
				};
			case "warning":
				return {
					confirmButtonClass:
						"bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-300",
					titleClass: "text-yellow-600 dark:text-yellow-400",
					iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
				};
			default:
				return {
					confirmButtonClass:
						"bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-300",
					titleClass: "text-blue-600 dark:text-blue-400",
					iconBg: "bg-blue-100 dark:bg-blue-900/30",
				};
		}
	};

	const styles = getTypeStyles();

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="mx-4 w-full max-w-md transform rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
				<div className="p-4">
					{/* Icon and Title */}
					<h3
						className={`text-lg font-semibold ${styles.titleClass}`}
					>
						{options.title || "Confirm Action"}
					</h3>

					{/* Message */}
					<div className="mb-4">
						<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
							{options.message}
						</p>
						{options.itemName && (
							<p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
								Item: {options.itemName}
							</p>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end space-x-3">
						<button
							onClick={onCancel}
							className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							{options.cancelText || "Cancel"}
						</button>
						<button
							onClick={onConfirm}
							className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 ${styles.confirmButtonClass}`}
							autoFocus
						>
							{options.confirmText || "Confirm"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

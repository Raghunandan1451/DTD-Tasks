import React from "react";
import { X } from "lucide-react";
import Button from "@src/components/ui/button/Button";

interface ModalLayoutProps {
	title: string;
	children: React.ReactNode;
	onClose: () => void;
	maxWidth?: string;
	footer?: React.ReactNode;
}

export const ModalLayout: React.FC<ModalLayoutProps> = ({
	title,
	children,
	onClose,
	maxWidth = "max-w-2xl",
	footer,
}) => (
	<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 z-50">
		<div
			className={`bg-gray-50/40 dark:bg-gray-800 rounded-xl shadow-xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto`}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
					{title}
				</h2>
				<Button
					onClick={onClose}
					className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
				>
					<X className="w-6 h-6" />
				</Button>
			</div>

			{/* Content */}
			<div className="p-4">{children}</div>

			{/* Footer */}
			{footer && (
				<div className="border-t border-gray-200 dark:border-gray-700 p-6">
					{footer}
				</div>
			)}
		</div>
	</div>
);

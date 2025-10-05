// components/EventModal/RecurringOptionsModal.tsx
import React from "react";
import { RefreshCw } from "lucide-react";
import { Event } from "@src/features/event/type";
import Button from "@src/components/ui/button/Button";

interface RecurringOptionsModalProps {
	event: Event;
	pendingAction: "edit" | "delete";
	onAction: (actionType: "single" | "all") => void;
	onCancel: () => void;
}

export const RecurringOptionsModal: React.FC<RecurringOptionsModalProps> = ({
	event,
	pendingAction,
	onAction,
	onCancel,
}) => (
	<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-60">
		<div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
			<div className="flex items-center gap-3 mb-4">
				<RefreshCw className="w-5 h-5 text-blue-500" />
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Recurring Event
				</h3>
			</div>

			<p className="text-gray-600 dark:text-gray-300 mb-6">
				This is a recurring event. What would you like to{" "}
				{pendingAction}?
			</p>

			<div className="space-y-3">
				<Button
					onClick={() => onAction("single")}
					className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
				>
					<div className="font-medium text-gray-900 dark:text-white">
						Only this occurrence
					</div>
					<div className="text-sm text-gray-500 dark:text-gray-400">
						{pendingAction === "edit" ? "Edit" : "Delete"} just this
						single event on{" "}
						{new Date(event.startDate).toLocaleDateString()}
					</div>
				</Button>

				<Button
					onClick={() => onAction("all")}
					className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
				>
					<div className="font-medium text-gray-900 dark:text-white">
						All occurrences
					</div>
					<div className="text-sm text-gray-500 dark:text-gray-400">
						{pendingAction === "edit" ? "Edit" : "Delete"} the
						entire recurring event series
					</div>
				</Button>
			</div>

			<div className="flex justify-end gap-2 mt-6">
				<Button
					onClick={onCancel}
					className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
				>
					Cancel
				</Button>
			</div>
		</div>
	</div>
);

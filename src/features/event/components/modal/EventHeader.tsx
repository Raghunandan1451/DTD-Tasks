import React from "react";
import { X, Edit2, Trash2, Save, RefreshCw } from "lucide-react";
import { Event } from "@src/features/event/type";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";

interface EventHeaderProps {
	event: Event;
	editData: Event;
	isEditing: boolean;
	isRecurringInstance: boolean;
	onEdit: () => void;
	onDelete: () => void;
	onSave: () => void;
	onCancel: () => void;
	onClose: () => void;
	onTitleChange: (title: string) => void;
}

export const EventHeader: React.FC<EventHeaderProps> = ({
	event,
	editData,
	isEditing,
	isRecurringInstance,
	onEdit,
	onDelete,
	onSave,
	onCancel,
	onClose,
	onTitleChange,
}) => (
	<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
		<div className="flex-1 flex items-center gap-3">
			{isRecurringInstance && (
				<RefreshCw className="w-5 h-5 text-green-500 flex-shrink-0" />
			)}
			{isEditing ? (
				<Input
					id="title"
					type="text"
					value={editData.title}
					onChange={(e) => onTitleChange(e.target.value)}
					className="text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white w-full"
				/>
			) : (
				<div className="flex-1">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						{event.title}
					</h2>
					{isRecurringInstance && (
						<p className="text-sm text-green-600 dark:text-green-400">
							Recurring Event •{" "}
							{new Date(event.startDate).toLocaleDateString()}
						</p>
					)}
				</div>
			)}
		</div>
		<div className="flex items-center gap-2 ml-4">
			{isEditing ? (
				<>
					<Button
						onClick={onSave}
						className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
					>
						<Save className="w-5 h-5" />
					</Button>
					<Button
						onClick={onCancel}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
					>
						<X className="w-5 h-5" />
					</Button>
				</>
			) : (
				<>
					<Button
						onClick={onEdit}
						className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
					>
						<Edit2 className="w-5 h-5" />
					</Button>
					<Button
						onClick={onDelete}
						className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
					>
						<Trash2 className="w-5 h-5" />
					</Button>
					<Button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
					>
						<X className="w-5 h-5" />
					</Button>
				</>
			)}
		</div>
	</div>
);

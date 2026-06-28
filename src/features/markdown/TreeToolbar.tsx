import React from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { SelectedItem } from "@src/features/markdown/TreeView";

interface TreeToolbarProps {
	selectedItem: SelectedItem | null;
	onAdd: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

const TreeToolbar: React.FC<TreeToolbarProps> = ({
	selectedItem,
	onAdd,
	onEdit,
	onDelete,
}) => {
	const disabled = !selectedItem;

	return (
		<div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-1">
			<Button
				onClick={onAdd}
				className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
				children={<Plus size={16} data-testid="add" />}
			/>
			<div className="flex items-center gap-1">
				<Button
					onClick={onEdit}
					disabled={disabled}
					className={`p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
						disabled
							? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
							: "text-gray-500 dark:text-gray-300 hover:text-yellow-500"
					}`}
					children={<Edit size={16} data-testid="edit" />}
				/>
				<Button
					onClick={onDelete}
					disabled={disabled}
					className={`p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 ${
						disabled
							? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
							: "text-gray-500 dark:text-gray-300 hover:text-red-500"
					}`}
					children={<Trash2 size={16} data-testid="trash" />}
				/>
			</div>
		</div>
	);
};

export default TreeToolbar;

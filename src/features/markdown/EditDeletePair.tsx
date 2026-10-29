import Button from "@src/components/ui/button/Button";
import { Edit, Trash2 } from "lucide-react";

interface EditDeletePairProps {
	onEdit: () => void;
	onDelete: () => void;
	iconSize?: number;
}

const EditDeletePair: React.FC<EditDeletePairProps> = ({
	onEdit,
	onDelete,
	iconSize = 16,
}) => {
	return (
		<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
			<Button
				onClick={(e) => {
					e.stopPropagation();
					onEdit();
				}}
				className="p-1 text-gray-500 dark:text-gray-300 hover:text-yellow-300 dark:hover:text-yellow-500 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-300"
				children={<Edit size={iconSize} data-testid="edit" />}
			/>
			<Button
				onClick={(e) => {
					e.stopPropagation();
					onDelete();
				}}
				className="p-1 text-gray-500 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-500 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300"
				children={<Trash2 size={iconSize} data-testid="trash" />}
			/>
		</div>
	);
};

export default EditDeletePair;

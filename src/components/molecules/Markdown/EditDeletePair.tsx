import Button from '@src/components/atoms/Button/Button';
import { Edit, Trash2 } from 'lucide-react';

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
		<div className="flex items-center gap-2 opcaity-0 group-hover:opacity-100 transition-opacity duration-200">
			<Button
				onClick={(e) => {
					e.stopPropagation();
					onEdit();
				}}
				className="p-1 text-gray-400 hover:text-yellow-500 rounded-full focus:outline-hidden focus:ring-3 focus:ring-yellow-300"
				children={<Edit size={iconSize} />}
			/>
			<Button
				onClick={(e) => {
					e.stopPropagation();
					onDelete();
				}}
				className="p-1 text-gray-400 hover:text-red-500 rounded-full focus:outline-hidden focus:ring-3 focus:ring-red-300"
				children={<Trash2 size={iconSize} />}
			/>
		</div>
	);
};

export default EditDeletePair;

import { Edit, Trash2 } from 'lucide-react';

const ActionButtons = ({ onRename, onDelete, iconSize = 16 }) => {
	return (
		<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
			<button
				onClick={(e) => {
					e.stopPropagation();
					onRename();
				}}
				className="p-1 text-gray-400 hover:text-yellow-500 rounded-full focus:outline-none focus:ring focus:ring-yellow-300">
				<Edit size={iconSize} />
			</button>

			<button
				onClick={(e) => {
					e.stopPropagation();
					onDelete();
				}}
				className="p-1 text-gray-400 hover:text-red-500 rounded-full focus:outline-none focus:ring focus:ring-red-300">
				<Trash2 size={iconSize} />
			</button>
		</div>
	);
};

export default ActionButtons;

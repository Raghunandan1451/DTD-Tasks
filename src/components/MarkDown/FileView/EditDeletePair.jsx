import { Edit, Trash2 } from 'lucide-react';
const EditDeletePair = () => {
	return (
		<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
			<button
				onClick={(e) => {
					e.stopPropagation(); // Prevent triggering file selection
					onRename({
						path: fullPath,
						type: item.type,
					});
					setRenameValue(item.path); // Initialize rename value with the current name
					setShowRenameInput(true);
				}}
				className="p-1 text-gray-400 hover:text-yellow-500 rounded-full focus:outline-none focus:ring focus:ring-yellow-300">
				<Edit size={16} />
			</button>

			{/* Delete Button */}
			<button
				onClick={(e) => {
					e.stopPropagation(); // Prevent triggering file selection
					onDelete(dispatch, fullPath); // Pass full path
				}}
				className="p-1 text-gray-400 hover:text-red-500 rounded-full focus:outline-none focus:ring focus:ring-red-300">
				<Trash2 size={16} />
			</button>
		</div>
	);
};

export default EditDeletePair;

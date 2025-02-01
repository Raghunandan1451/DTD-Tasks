// components/FolderItem.jsx
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import ActionButtons from '@components/MarkDown/actions/ActionButtons';

const FolderItem = ({ folder, isExpanded, onToggle, onDelete, onRename }) => {
	return (
		<div
			className="flex justify-between cursor-pointer group p-1 rounded-md"
			onClick={onToggle}>
			<span className="flex items-center ">
				{isExpanded ? (
					<ChevronDown size={16} />
				) : (
					<ChevronRight size={16} />
				)}
				<Folder size={16} className="text-yellow-500" />
				<span className="ml-2 truncate">{folder.path}</span>
			</span>
			<ActionButtons onDelete={onDelete} onRename={onRename} />
		</div>
	);
};
export default FolderItem;

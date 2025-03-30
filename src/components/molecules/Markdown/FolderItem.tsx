import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import EditDeletePair from '@src/components/molecules/Markdown/EditDeletePair';

interface FolderItemProps {
	path: string;
	isExpanded: boolean;
	onToggle: () => void;
	onDelete: () => void;
	onRename: () => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
	path,
	isExpanded,
	onToggle,
	onDelete,
	onRename,
}) => {
	return (
		<div
			className="flex justify-between cursor-pointer group p-1 rounded-md"
			onClick={onToggle}>
			<span className="flex items-center">
				{isExpanded ? (
					<ChevronDown size={16} />
				) : (
					<ChevronRight size={16} />
				)}
				<Folder size={16} className="text-yellow-500" />
				<span className="ml-2 truncate">{path}</span>
			</span>
			<EditDeletePair onDelete={onDelete} onEdit={onRename} />
		</div>
	);
};

export default FolderItem;

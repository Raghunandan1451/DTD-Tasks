import React from 'react';
import EditDeletePair from './EditDeletePair';
import { File } from 'lucide-react';

interface FileItemProps {
	path: string;
	isSelected: boolean;
	onSelect: () => void;
	onDelete: () => void;
	onRename: () => void;
}

const FileItem: React.FC<FileItemProps> = ({
	path,
	isSelected,
	onSelect,
	onDelete,
	onRename,
}) => (
	<div
		className={`flex justify-between cursor-pointer relative group p-1 rounded-md ${
			isSelected ? 'bg-gray-700' : ''
		}`}
		onClick={onSelect}>
		<span className="flex items-center ">
			<File size={16} className="text-blue-500" />
			<span className="ml-2 truncate">{path}</span>
		</span>
		<EditDeletePair onDelete={onDelete} onEdit={onRename} />
	</div>
);

export default FileItem;

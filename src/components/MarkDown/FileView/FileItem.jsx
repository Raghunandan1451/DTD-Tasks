// components/FileItem.jsx
import { File } from 'lucide-react';
import ActionButtons from '@components/MarkDown/actions/ActionButtons';

const FileItem = ({ file, isSelected, onSelect, onDelete, onRename }) => {
	return (
		<div
			className={`flex justify-between cursor-pointer relative group p-1 rounded-md ${
				isSelected ? 'bg-gray-700' : ''
			}`}
			onClick={() => onSelect(file)}>
			<span className="flex items-center ">
				<File size={16} className="text-blue-500" />
				<span className="ml-2 truncate">{file.path}</span>
			</span>
			<ActionButtons onDelete={onDelete} onRename={onRename} />
		</div>
	);
};
export default FileItem;

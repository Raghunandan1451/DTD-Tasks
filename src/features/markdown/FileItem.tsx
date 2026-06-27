import React from "react";
import { File } from "lucide-react";

interface FileItemProps {
	path: string;
	isSelected: boolean;
	onSelect: () => void;
}

const FileItem: React.FC<FileItemProps> = ({ path, isSelected, onSelect }) => (
	<div
		className={`flex items-center cursor-pointer p-1 rounded-md hover:bg-white/10 dark:hover:bg-black/10 transition ${
			isSelected ? "bg-blue-500/20 dark:bg-blue-400/20" : ""
		}`}
		onClick={onSelect}
	>
		<File size={16} className="text-blue-500 shrink-0" />
		<span className="ml-2">{path}</span>
	</div>
);

export default FileItem;

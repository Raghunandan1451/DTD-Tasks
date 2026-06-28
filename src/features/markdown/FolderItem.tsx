import { ChevronDown, ChevronRight, Folder } from "lucide-react";

interface FolderItemProps {
	path: string;
	isExpanded: boolean;
	isSelected: boolean;
	onToggleExpand: () => void;
	onSelect: () => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
	path,
	isExpanded,
	isSelected,
	onToggleExpand,
	onSelect,
}) => {
	return (
		<div
			className={`flex items-center cursor-pointer p-1 rounded-md hover:bg-white/10 dark:hover:bg-black/10 transition ${
				isSelected ? "bg-blue-500/20 dark:bg-blue-400/20" : ""
			}`}
			onClick={onSelect}
		>
			<span
				className="flex items-center shrink-0"
				onClick={(e) => {
					e.stopPropagation();
					onToggleExpand();
				}}
			>
				{isExpanded ? (
					<ChevronDown size={16} data-testid="chevron-down" />
				) : (
					<ChevronRight size={16} data-testid="chevron-right" />
				)}
			</span>
			<Folder size={16} className="text-yellow-500 shrink-0 ml-0.5" />
			<span className="ml-2">{path}</span>
		</div>
	);
};

export default FolderItem;

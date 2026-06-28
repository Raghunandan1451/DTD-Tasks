import React, { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	handleToggleFolder,
	handleFileToggleSelect,
	handleCreateFile,
	sortFilesAlphabetically,
} from "@src/lib/utils/treeUtils";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import { RootState } from "@src/lib/store/store";

import FileItem from "@src/features/markdown/FileItem";
import FolderItem from "@src/features/markdown/FolderItem";
import CreateFileFolder from "@src/features/markdown/CreateFileFolder";
import useNotifications from "@src/lib/hooks/useNotifications";
import { File, Folder } from "@src/features/markdown/type";

export interface SelectedItem {
	fullPath: string;
	name: string;
	type: "file" | "folder";
}

interface TreeViewProps {
	showInput: boolean;
	setShowInput: (value: boolean) => void;
	selectedItem: SelectedItem | null;
	setSelectedItem: (item: SelectedItem | null) => void;
}

const TreeView: React.FC<TreeViewProps> = ({
	showInput,
	setShowInput,
	selectedItem,
	setSelectedItem,
}) => {
	const dispatch = useDispatch();
	const { files, selectedFile } = useSelector(
		(state: RootState) => state.fileManager,
	);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set(),
	);
	const { notifications, showNotification } = useNotifications();
	const [newFilePath, setNewFilePath] = useState("");

	const flattenedItems = useMemo(() => {
		const processItems = (
			items: (File | Folder)[],
			depth = 0,
			parentPath = "",
		): (File | Folder)[] => {
			const sorted: (File | Folder)[] = sortFilesAlphabetically(items);
			return sorted.flatMap((item) => {
				const fullPath = parentPath
					? `${parentPath}/${item.path}`
					: item.path;
				const children =
					item.type === "folder" && expandedFolders.has(fullPath)
						? processItems(item.children, depth + 1, fullPath)
						: [];
				return [{ ...item, depth, fullPath }, ...children];
			});
		};
		return processItems(files);
	}, [files, expandedFolders]);

	// Toggle selection for an item (file or folder). Selecting the same
	// item again deselects it. Selecting a file also opens/closes it in
	// the editor; selecting a folder does not expand/collapse it - the
	// chevron handles that separately so you can select a folder without
	// being forced to open it.
	const handleSelect = (item: File | Folder) => {
		const fullPath = item.fullPath ?? "";
		const isSame = selectedItem?.fullPath === fullPath;

		if (item.type === "file") {
			handleFileToggleSelect(dispatch, fullPath, selectedFile ?? null);
		}

		setSelectedItem(
			isSame ? null : { fullPath, name: item.path, type: item.type },
		);
	};

	return (
		<div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 scrollbar-hide">
			{flattenedItems.map((item) => (
				<div
					key={item.fullPath}
					className="whitespace-nowrap"
					style={{ paddingLeft: `${(item.depth ?? 0) * 1.5}rem` }}
				>
					{item.type === "folder" ? (
						<FolderItem
							path={item.path}
							isExpanded={expandedFolders.has(
								item.fullPath ?? "",
							)}
							isSelected={
								selectedItem?.fullPath === item.fullPath
							}
							onToggleExpand={() =>
								handleToggleFolder(
									expandedFolders,
									setExpandedFolders,
									item.fullPath ?? "",
								)
							}
							onSelect={() => handleSelect(item)}
						/>
					) : (
						<FileItem
							path={item.path}
							isSelected={
								selectedItem?.fullPath === item.fullPath
							}
							onSelect={() => handleSelect(item)}
						/>
					)}
				</div>
			))}

			{showInput && (
				<CreateFileFolder
					setShowInput={setShowInput}
					newFilePath={newFilePath}
					setNewFilePath={setNewFilePath}
					onCreate={() => (
						handleCreateFile(
							dispatch,
							files,
							showNotification,
							newFilePath,
						),
						setShowInput(false),
						setNewFilePath("")
					)}
				/>
			)}

			<NotificationCenter notifications={notifications} />
		</div>
	);
};

export default TreeView;

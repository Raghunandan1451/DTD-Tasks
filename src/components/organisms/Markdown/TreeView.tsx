import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
	handleToggleFolder,
	handleFileSelect,
	handleCreateFile,
	handleDeleteFile,
	handleRenameFile,
	sortFilesAlphabetically,
} from '@src/utils/treeUtils';
import NotificationCenter from '@src/components/organisms/Notifications/NotificationCeter';
import { RootState } from '@src/store/store';

import FileItem from '@src/components/molecules/Markdown/FileItem';
import FolderItem from '@src/components/molecules/Markdown/FolderItem';

import CreateFileFolder from '@src/components/molecules/Markdown/CreateFileFolder';
import EditFileFolder from '@src/components/molecules/Markdown/EditFileFolder';
import useNotifications from '@src/hooks/useNotifications';
import { File, Folder } from '@src/components/shared/markdown';

interface TreeViewProps {
	showInput: boolean;
	setShowInput: (value: boolean) => void;
}

const TreeView: React.FC<TreeViewProps> = ({ showInput, setShowInput }) => {
	const dispatch = useDispatch();
	const { files, selectedFile } = useSelector(
		(state: RootState) => state.fileManager
	);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set()
	);
	const { notifications, showNotification } = useNotifications();
	const [renameTarget, setRenameTarget] = useState<{
		fullPath: string;
		name: string;
	} | null>(null); // Track the file/folder to rename}
	const [renameValue, setRenameValue] = useState(''); // Value for the new name
	const [showRenameInput, setShowRenameInput] = useState(false);
	const [newFilePath, setNewFilePath] = useState(''); // Value for the new name

	const flattenedItems = useMemo(() => {
		const processItems = (
			items: (File | Folder)[],
			depth = 0,
			parentPath = ''
		): (File | Folder)[] => {
			const sorted: (File | Folder)[] = sortFilesAlphabetically(items);
			return sorted.flatMap((item) => {
				const fullPath = parentPath
					? `${parentPath}/${item.path}`
					: item.path;
				const children =
					item.type === 'folder' && expandedFolders.has(fullPath)
						? processItems(item.children, depth + 1, fullPath)
						: [];
				return [{ ...item, depth, fullPath }, ...children];
			});
		};
		return processItems(files);
	}, [files, expandedFolders]);

	return (
		<div className="overflow-y-auto flex-1 min-h-0 scrollbar-hide w-60">
			{flattenedItems.map((item) => (
				<div
					key={item.fullPath}
					style={{ paddingLeft: `${item.depth ?? 0 * 1.5}rem` }}>
					{item.type === 'folder' ? (
						<FolderItem
							path={item.path}
							isExpanded={expandedFolders.has(
								item.fullPath ?? ''
							)}
							onToggle={() =>
								handleToggleFolder(
									expandedFolders,
									setExpandedFolders,
									item.fullPath ?? ''
								)
							}
							onDelete={() =>
								handleDeleteFile(
									dispatch,
									item.fullPath ?? '',
									showNotification
								)
							}
							onRename={() => {
								setRenameTarget({
									fullPath: item.fullPath ?? '',
									name: item.path,
								});
								setRenameValue(item.path);
								setShowRenameInput(true);
							}}
						/>
					) : (
						<FileItem
							path={item.path}
							isSelected={selectedFile === item.fullPath}
							onSelect={() =>
								handleFileSelect(
									dispatch,
									item,
									item.fullPath
										?.split('/')
										.slice(0, -1)
										.join('/')
								)
							}
							onDelete={() =>
								handleDeleteFile(
									dispatch,
									item.fullPath ?? '',
									showNotification
								)
							}
							onRename={() => {
								setRenameTarget({
									fullPath: item.fullPath ?? '',
									name: item.path,
								});
								setRenameValue(item.path);
								setShowRenameInput(true);
							}}
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
							newFilePath
						),
						setShowInput(false),
						setNewFilePath('')
					)}
				/>
			)}

			{showRenameInput && renameTarget && (
				<EditFileFolder
					renameValue={renameValue}
					setRenameValue={setRenameValue}
					setShowRenameInput={setShowRenameInput}
					onEdit={() => {
						handleRenameFile(
							dispatch,
							renameTarget.fullPath,
							renameValue,
							showNotification
						);
						setShowRenameInput(false);
						setRenameValue('');
					}}
				/>
			)}

			<NotificationCenter notifications={notifications} />
		</div>
	);
};

export default TreeView;

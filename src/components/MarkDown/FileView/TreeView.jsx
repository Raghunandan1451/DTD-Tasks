// components/TreeView.jsx
import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
	handleToggleFolder,
	handleFileSelect,
	handleCreateFile,
	handleDeleteFile,
	handleRenameFile,
	sortFilesAlphabetically,
} from '@utils/treeUtils';
import useNotifications from '@src/hooks/useNotifications';

import FileItem from '@components/MarkDown/FileView/FileItem';
import FolderItem from '@components/MarkDown/FileView/FolderItem';

import CreateBox from '@components/MarkDown/actions/CreateBox';
import RenameBox from '@components/MarkDown/actions/RenameBox';
import NotificationCenter from '@components/NotificationCeter';

const TreeView = ({ showInput, setShowInput }) => {
	const dispatch = useDispatch();
	const { files, selectedFile } = useSelector((state) => state.fileManager);
	const [expandedFolders, setExpandedFolders] = useState(new Set());
	const { notifications, showNotification } = useNotifications();
	const [renameTarget, setRenameTarget] = useState(null); // Track the file/folder to rename
	const [renameValue, setRenameValue] = useState(''); // Value for the new name
	const [newFilePath, setNewFilePath] = useState('');
	const [showRenameInput, setShowRenameInput] = useState(false);

	// Sorted and flattened items
	const flattenedItems = useMemo(() => {
		const processItems = (items, depth = 0, parentPath = '') => {
			const sorted = sortFilesAlphabetically(items);
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
			{/* File Tree */}
			{/* <div> */}
			{flattenedItems.map((item) => {
				return (
					<div
						key={item.fullPath}
						style={{ paddingLeft: `${item.depth * 1.5}rem` }}>
						{item.type === 'folder' ? (
							<FolderItem
								folder={item}
								isExpanded={expandedFolders.has(item.fullPath)}
								onToggle={() =>
									handleToggleFolder(
										expandedFolders,
										setExpandedFolders,
										item.fullPath
									)
								}
								onDelete={() =>
									handleDeleteFile(
										dispatch,
										item.fullPath,
										showNotification
									)
								}
								onRename={() => {
									setRenameTarget(item);
									setRenameValue(item.path);
									setShowRenameInput(true);
								}}
							/>
						) : (
							<FileItem
								file={item}
								isSelected={selectedFile === item.fullPath}
								onSelect={() =>
									handleFileSelect(
										dispatch,
										item,
										item.fullPath
											.split('/')
											.slice(0, -1)
											.join('/')
									)
								}
								onDelete={() =>
									handleDeleteFile(
										dispatch,
										item.fullPath,
										showNotification
									)
								}
								onRename={() => {
									setRenameTarget(item);
									setRenameValue(item.path);
									setShowRenameInput(true);
								}}
							/>
						)}
					</div>
				);
			})}
			{/* </div> */}
			{showInput && (
				<CreateBox
					setShowInput={setShowInput}
					mewFilePath={newFilePath}
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
			{showRenameInput && (
				<RenameBox
					renameValue={renameValue}
					setRenameValue={setRenameValue}
					setShowRenameInput={setShowRenameInput}
					onRename={() => (
						handleRenameFile(
							dispatch,
							renameTarget.fullPath,
							renameValue,
							showNotification
						),
						setShowRenameInput(false),
						setRenameValue('')
					)}
				/>
			)}

			<NotificationCenter notifications={notifications} />
		</div>
	);
};

export default TreeView;

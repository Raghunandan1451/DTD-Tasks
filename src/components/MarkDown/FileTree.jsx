import React, { useState } from 'react';
import {
	Folder,
	File,
	ChevronRight,
	ChevronDown,
	Plus,
	Trash2,
	Edit,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
	handleCreateFile,
	handleDeleteFile,
	handleFileSelect,
	handleRenameFile,
	toggleFolder,
} from '@utils/treeUtils';

const FileTree = () => {
	const { files, selectedFile } = useSelector((state) => state.fileManager);
	const dispatch = useDispatch();
	const [expandedFolders, setExpandedFolders] = useState(new Set());
	const [showInput, setShowInput] = useState(false);
	const [showRenameInput, setShowRenameInput] = useState(false);
	const [newFilePath, setNewFilePath] = useState('');
	const [renameTarget, setRenameTarget] = useState(null); // Track the file/folder to rename
	const [renameValue, setRenameValue] = useState(''); // Value for the new name

	const renderTree = (files, parentPath = '') => {
		const stack = [...files];
		const result = [];

		while (stack.length > 0) {
			const item = stack.pop();
			const isExpanded = expandedFolders.has(item.path);
			const fullPath = parentPath
				? `${parentPath}/${item.path}`
				: item.path;

			if (item.type === 'folder') {
				result.push(
					<div key={item.path} className="pl-2">
						<div
							onClick={() =>
								toggleFolder(
									expandedFolders,
									setExpandedFolders,
									item.path
								)
							}
							className="flex items-center cursor-pointer relative group p-1">
							{isExpanded ? (
								<ChevronDown size={16} />
							) : (
								<ChevronRight size={16} />
							)}
							<Folder size={16} />
							<strong>{item.path}</strong>

							{/* Rename Button */}
							<button
								onClick={(e) => {
									e.stopPropagation(); // Prevent triggering folder toggle
									setRenameTarget({
										path: fullPath,
										type: item.type,
									});
									setRenameValue(item.path); // Initialize rename value with the current name
									setShowRenameInput(true);
								}}
								className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-400 group-hover:text-yellow-500 p-1 rounded-full">
								<Edit size={16} />
							</button>

							{/* Delete Button */}
							<button
								onClick={(e) => {
									e.stopPropagation(); // Prevent triggering folder toggle
									handleDeleteFile(dispatch, fullPath); // Pass full path
								}}
								className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-400 group-hover:text-red-500 p-1 rounded-full">
								<Trash2 size={16} />
							</button>
						</div>
						{isExpanded && item.children && (
							<div>{renderTree(item.children, item.path)}</div>
						)}
					</div>
				);
			} else if (item.type === 'file') {
				result.push(
					<div
						key={item.path}
						onClick={() =>
							handleFileSelect(dispatch, item, parentPath)
						}
						className={`flex items-center pl-6 cursor-pointer relative group p-1 ${
							selectedFile?.path === fullPath ? 'bg-gray-600' : ''
						}`}>
						<File size={16} />
						<span className="ml-1 flex-grow">{item.path}</span>

						{/* Rename Button */}
						<button
							onClick={(e) => {
								e.stopPropagation(); // Prevent triggering file selection
								setRenameTarget({
									path: fullPath,
									type: item.type,
								});
								setRenameValue(item.path); // Initialize rename value with the current name
								setShowRenameInput(true);
							}}
							className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-400 group-hover:text-yellow-500 p-1 rounded-full">
							<Edit size={16} />
						</button>

						{/* Delete Button */}
						<button
							onClick={(e) => {
								e.stopPropagation(); // Prevent triggering file selection
								handleDeleteFile(dispatch, fullPath); // Pass full path
							}}
							className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-400 group-hover:text-red-500 p-1 rounded-full">
							<Trash2 size={16} />
						</button>
					</div>
				);
			}
		}

		return <>{result}</>;
	};

	return (
		<div className="w-64 border-r bg-gray-800">
			<div className="p-4 border-b flex justify-around">
				<button
					onClick={() => setShowInput(true)}
					className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-2">
					<Plus size={16} /> Add File
				</button>
			</div>
			{showInput && (
				<div
					className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setShowInput(false);
						}
					}}>
					<div className="bg-gray-600 p-6 rounded-lg shadow-lg w-72 text-center">
						<input
							type="text"
							value={newFilePath}
							onChange={(e) => setNewFilePath(e.target.value)}
							className="w-full bg-gray-700 text-white p-2 rounded"
							placeholder="Enter file path"
							autoFocus
						/>
						<button
							onClick={() =>
								handleCreateFile(
									dispatch,
									files,
									setNewFilePath,
									setShowInput,
									newFilePath
								)
							}
							className="mt-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
							Create
						</button>
					</div>
				</div>
			)}
			{showRenameInput && (
				<div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
					<div className="bg-gray-600 p-6 rounded-lg shadow-lg w-72 text-center">
						<input
							type="text"
							value={renameValue}
							onChange={(e) => setRenameValue(e.target.value)}
							className="w-full bg-gray-700 text-white p-2 rounded"
							placeholder="Enter new name"
							autoFocus
						/>
						<div className="flex justify-center mt-3 gap-2">
							<button
								onClick={() => {
									handleRenameFile(
										dispatch,
										renameTarget.path,
										renameValue
									);
									setShowRenameInput(false);
									setRenameValue(''); // Clear input
								}}
								className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
								Rename
							</button>
							<button
								onClick={() => {
									setShowRenameInput(false);
									setRenameValue(''); // Clear input
								}}
								className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			<div>{renderTree(files)}</div>
		</div>
	);
};

export default FileTree;

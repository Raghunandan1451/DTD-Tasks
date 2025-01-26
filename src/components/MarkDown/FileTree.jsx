import React, { useState } from 'react';
import {
	Folder,
	File,
	ChevronRight,
	ChevronDown,
	Plus,
	Trash2,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
	handleCreateFile,
	handleDeleteFile,
	handleFileSelect,
	toggleFolder,
} from '@utils/treeUtils';

const FileTree = () => {
	const { files, selectedFile } = useSelector((state) => state.fileManager);
	const dispatch = useDispatch();
	const [expandedFolders, setExpandedFolders] = useState(new Set());
	const [showInput, setShowInput] = useState(false);
	const [newFilePath, setNewFilePath] = useState('');

	const renderTree = (files) => {
		const stack = [...files];
		const result = [];

		while (stack.length > 0) {
			const item = stack.pop();
			const isExpanded = expandedFolders.has(item.path);

			if (item.type === 'folder') {
				result.push(
					<div key={item.path} className="pl-4">
						<div
							onClick={() =>
								toggleFolder(
									expandedFolders,
									setExpandedFolders,
									item.path
								)
							}
							className="cursor-pointer flex items-center gap-2">
							{isExpanded ? (
								<ChevronDown size={16} />
							) : (
								<ChevronRight size={16} />
							)}
							<Folder size={16} />
							<strong>{item.path}</strong>
						</div>
						{isExpanded && item.children && (
							<div>{renderTree(item.children)}</div>
						)}
					</div>
				);
			} else if (item.type === 'file') {
				result.push(
					<div
						key={item.path}
						onClick={() => handleFileSelect(dispatch, item)}
						className={`flex items-center pl-6 cursor-pointer ${
							selectedFile?.path === item.path
								? 'bg-gray-600'
								: ''
						}`}>
						<File size={16} />
						<span className="ml-1">{item.path}</span>
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
				{selectedFile && (
					<button
						onClick={() => handleDeleteFile(dispatch, selectedFile)}
						className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-2">
						<Trash2 size={16} /> Delete
					</button>
				)}
			</div>
			{showInput && (
				<div className="p-4">
					<input
						type="text"
						value={newFilePath}
						onChange={(e) => setNewFilePath(e.target.value)}
						className="w-full bg-gray-700 text-white p-2 rounded"
						placeholder="Enter file path"
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
			)}
			<div>{renderTree(files)}</div>
		</div>
	);
};

export default FileTree;

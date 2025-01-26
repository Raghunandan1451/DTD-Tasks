import React from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';

export const renderTree = (
	files,
	expandedFolders,
	toggleFolder,
	onFileSelect,
	selectedFile,
	path = ''
) => {
	return files.map((item) => {
		const fullPath = path ? `${path}/${item.name}` : item.name;
		const isFolder = item.type === 'folder';
		const isExpanded = expandedFolders.has(fullPath);

		return (
			<div key={fullPath} className="ml-4">
				<div
					className={`flex items-center gap-2 p-1 rounded hover:bg-gray-700 cursor-pointer ${
						selectedFile?.path === fullPath ? 'bg-gray-700' : ''
					}`}
					onClick={() =>
						isFolder ? toggleFolder(fullPath) : onFileSelect(item)
					}>
					{isFolder ? (
						<>
							{isExpanded ? (
								<ChevronDown size={16} />
							) : (
								<ChevronRight size={16} />
							)}
							<Folder size={16} className="text-blue-500" />
						</>
					) : (
						<File size={16} className="text-gray-500" />
					)}
					<span className="text-sm">{item.name}</span>
				</div>

				{isFolder && isExpanded && (
					<div className="ml-2">
						{renderTree(
							item.children,
							expandedFolders,
							toggleFolder,
							onFileSelect,
							selectedFile,
							fullPath
						)}
					</div>
				)}
			</div>
		);
	});
};

// Helper to add `.md` if not present
export const processPath = (path) => {
	if (!path.endsWith('.md')) {
		return `${path}.md`;
	}
	return path;
};

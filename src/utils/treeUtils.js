import {
	addFile,
	selectFile,
	deleteFile,
	renameFile,
} from '@store/markdownSlice';

export const toggleFolder = (expandedFolders, setExpandedFolders, path) => {
	const newExpanded = new Set(expandedFolders);
	if (newExpanded.has(path)) {
		newExpanded.delete(path);
	} else {
		newExpanded.add(path);
	}
	setExpandedFolders(newExpanded);
};

export const handleFileSelect = (dispatch, item, parentPath = '') => {
	// Create the full path using the parentPath (folder) and the file path
	const fullPath = parentPath ? `${parentPath}/${item.path}` : item.path;
	dispatch(selectFile({ path: fullPath, content: item.content }));
};

export const handleCreateFile = (
	dispatch,
	files,
	setNewFilePath,
	setShowInput,
	newFilePath
) => {
	if (!newFilePath.trim()) return;

	// Ensure file path ends with '.md'
	const filePath = newFilePath.trim().endsWith('.md')
		? newFilePath.trim()
		: `${newFilePath.trim()}.md`;

	const parts = filePath.split('/');
	const filename = parts.pop(); // Extract the filename
	let current = files;

	// Traverse through the file tree to the target directory
	for (const folderName of parts) {
		const folder = current.find(
			(item) => item.type === 'folder' && item.path === folderName
		);
		if (folder) {
			current = folder.children;
		} else {
			// If folder doesn't exist, break traversal (will create a new one in the reducer)
			current = null;
			break;
		}
	}

	// Check for duplicate file in the current level
	if (current) {
		const fileExists = current.some(
			(item) => item.type === 'file' && item.path === filename
		);
		if (fileExists) {
			alert('A file with this name already exists in this directory!');
			return;
		}
	}

	// Dispatch the action to add the file
	dispatch(addFile({ path: filePath, content: '' }));

	// Reset input states
	setNewFilePath('');
	setShowInput(false);
};

export const handleDeleteFile = (dispatch, fullPath) => {
	if (fullPath) {
		dispatch(deleteFile({ path: fullPath }));
	}
};

export const handleRenameFile = (dispatch, path, newName) => {
	console.log(path, newName);
	if (newName) {
		dispatch(renameFile({ oldPath: path, newName }));
	}
};

export const findFileByPath = (files, fullPath) => {
	const pathParts = fullPath.split('/').filter(Boolean);
	let currentFiles = files;

	for (const part of pathParts) {
		const fileOrFolder = currentFiles.find((item) => item.path === part);

		if (!fileOrFolder) return null; // Path not found

		// If it's a folder, continue searching its children
		if (fileOrFolder.type === 'folder' && fileOrFolder.children) {
			currentFiles = fileOrFolder.children;
		} else if (fileOrFolder.type === 'file') {
			return fileOrFolder; // Found the file
		}
	}

	return null;
};

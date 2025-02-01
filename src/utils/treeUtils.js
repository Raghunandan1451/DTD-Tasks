import {
	addFile,
	selectFile,
	deleteFile,
	renameFile,
} from '@store/markdownSlice';

export const handleToggleFolder = (
	expandedFolders,
	setExpandedFolders,
	path
) => {
	const newExpanded = new Set(expandedFolders);
	newExpanded.has(path) ? newExpanded.delete(path) : newExpanded.add(path);
	setExpandedFolders(newExpanded);
};

export const handleFileSelect = (dispatch, item, parentPath = '') => {
	// CORRECTED: Use proper path joining
	const fullPath = [parentPath, item.path].filter(Boolean).join('/');
	dispatch(selectFile(fullPath)); // Dispatch just the path string
};

export const handleCreateFile = (
	dispatch,
	files,
	showNotification,
	newFilePath
) => {
	if (!newFilePath.trim()) {
		showNotification('Please enter a file name', 'error');
		return;
	}

	const parts = newFilePath.split('/');
	const filename = parts.pop();
	let current = files;

	parts.forEach((folderName) => {
		const folder = current.find(
			(item) => item.type === 'folder' && item.path === folderName
		);

		if (folder) {
			current = folder.children;
		}
	});

	const isFileExist = current.some(
		(item) => item.type === 'file' && item.path === filename
	);

	if (isFileExist) {
		showNotification('File already exists in this directory!', 'error');
		return;
	}

	const filePath = newFilePath.trim().endsWith('.md')
		? newFilePath.trim()
		: `${newFilePath.trim()}.md`;

	dispatch(addFile({ path: filePath, content: '' }));
	showNotification('File created successfully!', 'success');
};

export const handleDeleteFile = (dispatch, fullPath, showNotification) => {
	if (fullPath) {
		dispatch(deleteFile({ path: fullPath }));
		showNotification('File deleted successfully', 'success');
	}
};

export const handleRenameFile = (dispatch, path, newName, showNotification) => {
	console.log(path, newName);
	if (!newName) {
		showNotification('Please enter a valid name', 'error');
		return;
	}

	if (newName.includes('/')) {
		showNotification('Name cannot contain slashes', 'error');
		return;
	}

	dispatch(renameFile({ oldPath: path, newName }));
	showNotification('File renamed successfully', 'success');
};

export const findFileByPath = (files, fullPath) => {
	// Add error handling for invalid inputs
	if (!fullPath || typeof fullPath !== 'string') {
		console.error('Invalid path provided to findFileByPath:', fullPath);
		return null;
	}

	const pathParts = fullPath.split('/').filter(Boolean);
	let currentFiles = files || []; // Handle undefined files array

	for (const part of pathParts) {
		const item = currentFiles.find((el) => el?.path === part); // Null-safe check

		if (!item) return null;

		// Handle final segment
		if (part === pathParts[pathParts.length - 1]) {
			return item.type === 'file' ? item : null;
		}

		// Continue only if it's a folder with children
		if (item.type === 'folder' && item.children) {
			currentFiles = item.children;
		} else {
			return null; // Path tries to traverse a file
		}
	}

	return null;
};

// Sorting function (A-Z, folders first)
export const sortFilesAlphabetically = (items) => {
	return [...items].sort((a, b) => {
		// Folders first
		if (a.type === 'folder' && b.type !== 'folder') return -1;
		if (b.type === 'folder' && a.type !== 'folder') return 1;

		// Case-insensitive alphabetical sort
		return a.path.localeCompare(b.path, undefined, { sensitivity: 'base' });
	});
};

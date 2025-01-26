import { addFile, selectFile, deleteFile } from '@store/markdownSlice';

export const toggleFolder = (expandedFolders, setExpandedFolders, path) => {
	const newExpanded = new Set(expandedFolders);
	if (newExpanded.has(path)) {
		newExpanded.delete(path);
	} else {
		newExpanded.add(path);
	}
	setExpandedFolders(newExpanded);
};

export const handleFileSelect = (dispatch, file) => {
	dispatch(selectFile(file));
};

export const handleCreateFile = (
	dispatch,
	files,
	setNewFilePath,
	setShowInput,
	newFilePath
) => {
	if (!newFilePath.trim()) return;

	const parts = newFilePath.split('/');
	const filename = parts.pop(); // Extract the file name
	let current = files;

	// Traverse to the target folder
	parts.forEach((folderName) => {
		const folder = current.find(
			(item) => item.type === 'folder' && item.path === folderName
		);
		if (folder) {
			current = folder.children;
		}
	});

	// Check if the file already exists in the current folder
	const fileExists = current.some(
		(item) => item.type === 'file' && item.path === filename
	);

	if (fileExists) {
		// Optionally show a message to the user (e.g., via state or alert)
		alert('A file with this name already exists!');
		return;
	}

	// If the file doesn't exist, dispatch the addFile action

	const filePath = newFilePath.trim().endsWith('.md')
		? newFilePath.trim()
		: `${newFilePath.trim()}.md`;

	dispatch(addFile({ path: `${filePath}`, content: '' }));
	setNewFilePath('');
	setShowInput(false);
};

export const handleDeleteFile = (dispatch, selectedFile) => {
	if (selectedFile) {
		dispatch(deleteFile({ path: selectedFile.path }));
	}
};

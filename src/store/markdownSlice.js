import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	files: [], // Initially empty
	selectedFile: null,
	content: '',
};

const markdownSlice = createSlice({
	name: 'fileManager',
	initialState,
	reducers: {
		addFile: (state, action) => {
			const { path, content = '' } = action.payload;
			const parts = path.split('/');
			const filename = parts.pop(); // Extract the file name
			let current = state.files;

			const stack = [...parts]; // Stack to traverse parts
			while (stack.length > 0) {
				const folderName = stack.shift();
				let folder = current.find(
					(item) => item.type === 'folder' && item.path === folderName
				);

				if (!folder) {
					folder = { path: folderName, type: 'folder', children: [] };
					current.push(folder);
				}
				current = folder.children;
			}

			// Add the file
			current.push({ path: filename, type: 'file', content });
		},
		renameFile: (state, action) => {
			const { oldPath, newPath } = action.payload;
			const oldParts = oldPath.split('/');
			const newParts = newPath.split('/');
			const oldFilename = oldParts.pop(); // Extract the old filename
			const newFilename = newParts.pop(); // Extract the new filename

			let current = state.files;

			// Traverse through folders to find the target file or folder
			oldParts.forEach((folderName) => {
				const folder = current.find(
					(item) => item.type === 'folder' && item.path === folderName
				);
				if (folder) {
					current = folder.children;
				}
			});

			// Find the item and rename it
			const item = current.find(
				(item) => item.path === oldFilename // Matching by file/folder name
			);

			if (item) {
				item.path = newFilename; // Rename the file/folder
			}
		},
		deleteFile: (state, action) => {
			const { path } = action.payload;
			const parts = path.split('/');
			const filename = parts.pop(); // Extract the file name
			let current = state.files;

			// Traverse through folders to find the target folder and its children
			parts.forEach((folderName) => {
				const folder = current.find(
					(item) => item.type === 'folder' && item.path === folderName
				);
				if (folder) {
					current = folder.children; // Update the current reference to the folder's children
				}
			});

			// Now, delete the file only from the current folder's children
			const fileIndex = current.findIndex(
				(item) => item.type === 'file' && item.path === filename
			);

			// If the file is found, remove it
			if (fileIndex !== -1) {
				current.splice(fileIndex, 1); // Remove the file from the array at fileIndex
			}
		},
		updateFileContent: (state, action) => {
			const { path, content } = action.payload;
			const parts = path.split('/');
			const filename = parts.pop(); // Extract the file name
			let current = state.files;

			// Traverse through folders to find the file
			parts.forEach((folderName) => {
				const folder = current.find(
					(item) => item.type === 'folder' && item.path === folderName
				);

				if (folder) {
					current = folder.children;
				}
			});

			// Update the file content
			const file = current.find(
				(item) => item.type === 'file' && item.path === filename
			);
			if (file) {
				file.content = content;
			}
		},
		selectFile: (state, action) => {
			state.selectedFile = action.payload;
			state.content = action.payload.content || ''; // Default to empty string if no content
		},
	},
});

export const { addFile, updateFileContent, selectFile, deleteFile } =
	markdownSlice.actions;
export default markdownSlice.reducer;

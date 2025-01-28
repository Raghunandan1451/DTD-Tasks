import { createSlice } from '@reduxjs/toolkit';
import { findFileByPath } from '@utils/treeUtils';

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
			const { oldPath, newName } = action.payload;

			// Find the file/folder and rename it
			const parts = oldPath.split('/').filter(Boolean);
			const targetName = parts.pop();

			let currentLevel = state.files;

			// Traverse to the parent folder
			for (const part of parts) {
				const folder = currentLevel.find(
					(item) => item.type === 'folder' && item.path === part
				);
				if (!folder) return; // Folder not found
				currentLevel = folder.children;
			}

			// Find the target file/folder
			const item = currentLevel.find(
				(item) => item.type && item.path === targetName
			);
			if (item) {
				item.path = newName;
			}
		},
		deleteFile: (state, action) => {
			const { path } = action.payload;

			// Split path into parts and filter out empty strings
			const pathParts = path.split('/').filter(Boolean);
			if (pathParts.length === 0) return;

			// The last part is the target file/folder name
			const targetName = pathParts.pop();

			// Start from the root files
			let currentLevel = state.files;
			let parentCollection = state.files;

			// Iterate through each path part to find the parent folder
			for (const part of pathParts) {
				const folder = currentLevel.find(
					(item) => item.type === 'folder' && item.path.endsWith(part)
				);

				if (!folder || !folder.children) return; // Path not found

				parentCollection = folder.children;
				currentLevel = folder.children;
			}

			// Find the index in the parent collection
			const deleteIndex = parentCollection.findIndex((item) =>
				item.path.endsWith(targetName)
			);

			if (deleteIndex !== -1) {
				parentCollection.splice(deleteIndex, 1);

				// Clear selection if deleted file was selected
				if (state.selectedFile?.path === path) {
					state.selectedFile = null;
				}
			}
		},
		updateFileContent: (state, action) => {
			const { path, content } = action.payload;
			const parts = path.split('/');
			const filename = parts.pop();
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
			const { path } = action.payload;

			// Find the file using the full path (handle both file and folder structures)
			const file = findFileByPath(state.files, path);

			if (file) {
				state.selectedFile = file; // Store the entire file object
				state.content = file.content || ''; // Default to empty string if no content
			}
		},
	},
});

export const {
	addFile,
	updateFileContent,
	selectFile,
	deleteFile,
	renameFile,
} = markdownSlice.actions;
export default markdownSlice.reducer;

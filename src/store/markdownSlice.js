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
			const segments = path.split('/').filter(Boolean);

			// ========================
			// 1. Handle Root Files
			// ========================
			if (segments.length === 1) {
				state.files = state.files.map((file) =>
					file.path === segments[0] && file.type === 'file'
						? { ...file, content }
						: file
				);

				// Update content if it's the selected file
				if (state.selectedFile === path) {
					state.content = content;
				}
				return;
			}

			// ========================
			// 2. Handle Nested Files
			// ========================
			const fileName = segments.pop();
			let currentFiles = [...state.files];
			const newFiles = [...state.files]; // Clone root array
			let parentArray = newFiles;

			// Traverse folder structure
			for (const segment of segments) {
				const folderIndex = parentArray.findIndex(
					(item) => item.path === segment && item.type === 'folder'
				);

				if (folderIndex === -1) return; // Path invalid

				// Clone folder and its children
				const folder = {
					...parentArray[folderIndex],
					children: [...parentArray[folderIndex].children],
				};

				// Update parent reference
				parentArray[folderIndex] = folder;
				parentArray = folder.children;
			}

			// Update target file
			const fileIndex = parentArray.findIndex(
				(item) => item.path === fileName && item.type === 'file'
			);

			if (fileIndex !== -1) {
				parentArray[fileIndex] = {
					...parentArray[fileIndex],
					content,
				};

				// Update state with cloned structure
				state.files = newFiles;

				// Sync content if selected
				if (state.selectedFile === path) {
					state.content = content;
				}
			}
		},
		selectFile: (state, action) => {
			const path = action.payload;
			// Reset state first
			state.selectedFile = null;
			state.content = '';

			if (!path || typeof path !== 'string') {
				console.error('Invalid path in selectFile:', path);
				return;
			}

			const file = findFileByPath(state.files, path);

			if (file?.type === 'file') {
				state.selectedFile = path;
				state.content = file.content;
			} else {
				state.selectedFile = null;
				state.content = '';
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

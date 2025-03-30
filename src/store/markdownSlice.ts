import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { findFileByPath } from '@src/utils/treeUtils';
import { File, Folder, FileState } from '@src/components/shared/markdown';
import { getFromLocalStorage } from '@src/utils/persistMiddleware';

const getInitialState = (): FileState => {
	const storedData = getFromLocalStorage<FileState>('redux_markdown_data');
	return storedData || { files: [], selectedFile: null, content: '' };
};

const markdownSlice = createSlice({
	name: 'fileManager',
	initialState: getInitialState(),
	reducers: {
		addFolder: (
			state,
			action: PayloadAction<{ parentPath: string; folder: Folder }>
		) => {
			const { parentPath, folder } = action.payload;
			const parts = parentPath.split('/').filter(Boolean);

			let current: (File | Folder)[] = state.files;
			for (const part of parts) {
				const existing = current.find(
					(item) => item.type === 'folder' && item.path === part
				) as Folder | undefined;
				if (!existing) return;
				current = existing.children;
			}

			if (!current.some((item) => item.path === folder.path)) {
				current.push(folder);
			}
		},
		addFile: (
			state,
			action: PayloadAction<{
				path: string;
				content: string;
				parentPath: string;
			}>
		) => {
			const { path, content, parentPath } = action.payload;
			const parts = parentPath.split('/').filter(Boolean);

			let current: (File | Folder)[] = state.files;
			for (const part of parts) {
				const existing = current.find(
					(item) => item.type === 'folder' && item.path === part
				) as Folder | undefined;
				if (!existing) return;
				current = existing.children;
			}

			if (!current.some((item) => item.path === path)) {
				current.push({
					path,
					type: 'file',
					content,
				});
			}
		},
		renameFile: (
			state,
			action: PayloadAction<{ oldPath: string; newName: string }>
		) => {
			const { oldPath, newName } = action.payload;

			// Find the file/folder and rename it
			const parts = oldPath.split('/').filter(Boolean);
			const targetName = parts.pop();

			let currentLevel: (File | Folder)[] = state.files;

			// Traverse to the parent folder
			for (const part of parts) {
				const folder = currentLevel.find(
					(item) => item.type === 'folder' && item.path === part
				) as Folder | undefined;
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
		deleteFile: (state, action: PayloadAction<{ path: string }>) => {
			const { path } = action.payload;

			// Split path into parts and filter out empty strings
			const pathParts = path.split('/').filter(Boolean);
			if (pathParts.length === 0) return;

			// The last part is the target file/folder name
			const targetName = pathParts.pop();
			if (!targetName) return;

			// Start from the root files
			let currentLevel: (File | Folder)[] = state.files;
			let parentCollection: (File | Folder)[] = state.files;

			// Iterate through each path part to find the parent folder
			for (const part of pathParts) {
				const folder = currentLevel.find(
					(item) => item.type === 'folder' && item.path.endsWith(part)
				) as Folder | undefined;

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
				if (state.selectedFile === path) {
					state.selectedFile = null;
				}
			}
		},
		updateFileContent: (
			state,
			action: PayloadAction<{ path: string; content: string }>
		) => {
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
			const newFiles = [...state.files]; // Clone root array
			let parentArray = newFiles;

			// Traverse folder structure
			for (const segment of segments) {
				const folderIndex = parentArray.findIndex(
					(item) => item.path === segment && item.type === 'folder'
				);

				if (folderIndex === -1) return; // Path invalid

				// Clone folder and its children
				const folder = parentArray[folderIndex] as Folder;

				// Clone folder and its children
				const updatedFolder: Folder = {
					...folder,
					children: [...folder.children],
				};

				// Update parent reference
				parentArray[folderIndex] = updatedFolder;
				parentArray = updatedFolder.children;
			}

			// Update target file
			const fileIndex = parentArray.findIndex(
				(item) => item.path === fileName && item.type === 'file'
			);

			if (fileIndex !== -1) {
				const file = parentArray[fileIndex] as File;
				parentArray[fileIndex] = {
					...file,
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
	addFolder,
	addFile,
	updateFileContent,
	selectFile,
	deleteFile,
	renameFile,
} = markdownSlice.actions;
export default markdownSlice.reducer;

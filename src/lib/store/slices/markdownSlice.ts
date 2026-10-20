import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { findFileByPath } from "@src/lib/utils/treeUtils";
import { File, Folder, FileState } from "@src/features/markdown/type";

const MARKDOWN_RULES_CONTENT = `# Markdown Formatting Guide

Welcome to your List Manager! Here's how to format your markdown files.

## Basic Formatting

- **bold** - Use \`**text**\` for bold text
- *italic* - Use \`*text*\` for italic text  
- __underline__ - Use \`__text__\` for underlined text
- ~~strikethrough~~ - Use \`~~text~~\` for strikethrough
* \`code\` - Use backticks for inline code

## Structure

### Headings
- \`# Large Heading\` for main titles
- \`## Medium Heading\` for sections
- \`### Small Heading\` for subsections

### Lists
- Use \`-\` followed by a space for bullet points
- Example:
  - Item 1
  - Item 2
  - Item 3

### Blockquotes
> Use \`> text\` to create centered, italic quotes
> Perfect for emphasis or citations

## Novel/Story Formatting

### Character Dialogue
Speaker 1: This is how you write character dialogue!
Player_2: Names can include numbers and underscores
Character Name: Even spaces work in speaker names

**Format:** \`Speaker: dialogue text\`  
**Note:** Speaker name must start with a capital letter

### Indented Paragraphs
~> Use \`~>\` at the start of a line for book-style indented paragraphs.
~> This is perfect for novel or story writing.

## Links
[Link text](https://example.com) - Use \`[text](url)\` format

## Code Blocks
Use triple backticks for multi-line code:

\`\`\`
function example() {
  return "Hello, World!";
}
\`\`\`

---

**Tip:** Combine these elements to create rich, formatted documents!
`;

const initialState: FileState = {
	files: [
		{
			path: "Markdown_Rules.md",
			type: "file",
			content: MARKDOWN_RULES_CONTENT,
		},
	],
	selectedFile: null,
	content: "",
	loaded: false,
};

const markdownSlice = createSlice({
	name: "fileManager",
	initialState: initialState,
	reducers: {
		setFileState: (_, action: PayloadAction<FileState>) => {
			return { ...action.payload, loaded: true };
		},
		addFolder: (
			state,
			action: PayloadAction<{ parentPath: string; folder: Folder }>
		) => {
			const { parentPath, folder } = action.payload;
			const parts = parentPath.split("/").filter(Boolean);

			let current: (File | Folder)[] = state.files;
			for (const part of parts) {
				const existing = current.find(
					(item) => item.type === "folder" && item.path === part
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
			const parts = parentPath.split("/").filter(Boolean);

			let current: (File | Folder)[] = state.files;
			for (const part of parts) {
				const existing = current.find(
					(item) => item.type === "folder" && item.path === part
				) as Folder | undefined;
				if (!existing) return;
				current = existing.children;
			}

			if (!current.some((item) => item.path === path)) {
				current.push({
					path,
					type: "file",
					content,
				});
			}
		},
		renameFile: (
			state,
			action: PayloadAction<{ oldPath: string; newName: string }>
		) => {
			const { oldPath, newName } = action.payload;

			const parts = oldPath.split("/").filter(Boolean);
			const targetName = parts.pop();

			let currentLevel: (File | Folder)[] = state.files;

			for (const part of parts) {
				const folder = currentLevel.find(
					(item) => item.type === "folder" && item.path === part
				) as Folder | undefined;
				if (!folder) return; // Folder not found
				currentLevel = folder.children;
			}

			const item = currentLevel.find(
				(item) => item.type && item.path === targetName
			);
			if (item) {
				item.path = newName;
			}
		},
		deleteFile: (state, action: PayloadAction<{ path: string }>) => {
			const { path } = action.payload;

			const pathParts = path.split("/").filter(Boolean);
			if (pathParts.length === 0) return;

			const targetName = pathParts.pop();
			if (!targetName) return;

			let currentLevel: (File | Folder)[] = state.files;
			let parentCollection: (File | Folder)[] = state.files;

			for (const part of pathParts) {
				const folder = currentLevel.find(
					(item) => item.type === "folder" && item.path.endsWith(part)
				) as Folder | undefined;

				if (!folder || !folder.children) return; // Path not found

				parentCollection = folder.children;
				currentLevel = folder.children;
			}

			const deleteIndex = parentCollection.findIndex((item) =>
				item.path.endsWith(targetName)
			);

			if (deleteIndex !== -1) {
				parentCollection.splice(deleteIndex, 1);

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
			const segments = path.split("/").filter(Boolean);

			if (segments.length === 1) {
				state.files = state.files.map((file) =>
					file.path === segments[0] && file.type === "file"
						? { ...file, content }
						: file
				);

				if (state.selectedFile === path) {
					state.content = content;
				}
				return;
			}

			const fileName = segments.pop();
			const newFiles = [...state.files]; // Clone root array
			let parentArray = newFiles;

			for (const segment of segments) {
				const folderIndex = parentArray.findIndex(
					(item) => item.path === segment && item.type === "folder"
				);

				if (folderIndex === -1) return; // Path invalid

				const folder = parentArray[folderIndex] as Folder;

				const updatedFolder: Folder = {
					...folder,
					children: [...folder.children],
				};

				parentArray[folderIndex] = updatedFolder;
				parentArray = updatedFolder.children;
			}

			const fileIndex = parentArray.findIndex(
				(item) => item.path === fileName && item.type === "file"
			);

			if (fileIndex !== -1) {
				const file = parentArray[fileIndex] as File;
				parentArray[fileIndex] = {
					...file,
					content,
				};

				state.files = newFiles;

				if (state.selectedFile === path) {
					state.content = content;
				}
			}
		},
		selectFile: (state, action) => {
			const path = action.payload;
			state.selectedFile = null;
			state.content = "";

			if (!path || typeof path !== "string") {
				console.error("Invalid path in selectFile:", path);
				return;
			}

			const file = findFileByPath(state.files, path);

			if (file?.type === "file") {
				state.selectedFile = path;
				state.content = file.content;
			} else {
				state.selectedFile = null;
				state.content = "";
			}
		},
	},
});

export const {
	setFileState,
	addFolder,
	addFile,
	updateFileContent,
	selectFile,
	deleteFile,
	renameFile,
} = markdownSlice.actions;
export default markdownSlice.reducer;

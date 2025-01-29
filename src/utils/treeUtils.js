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
	// CORRECTED: Use proper path joining
	const fullPath = [parentPath, item.path].filter(Boolean).join('/');
	dispatch(selectFile(fullPath)); // Dispatch just the path string
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

export const sortFilesAlphabetically = (items) => {
	return items
		.slice() // Create a shallow copy to avoid mutating the original array
		.sort((a, b) => b.path.localeCompare(a.path)) // Sort in ascending order (ABC...)
		.map((item) => {
			// If it's a folder, sort its children recursively
			if (item.type === 'folder' && item.children) {
				return {
					...item,
					children: sortFilesAlphabetically(item.children),
				};
			}
			return item;
		});
};

// utils/markdownParser.js
import React from 'react';

export const parseMarkdown = (markdown) => {
	const lines = markdown.split('\n');
	const elements = [];
	let inCodeBlock = false;
	let codeBlockContent = [];

	const parseInline = (text) => {
		// Processing order matters (more specific first)
		const rules = [
			{
				// Code - highest priority
				pattern: /`([^`]+)`/g,
				component: (content) =>
					React.createElement(
						'code',
						{ className: 'bg-gray-700 px-1 rounded' },
						content
					),
			},
			{
				// Bold - no spaces allowed
				pattern: /\*\*([^\s*][^*]*[^\s*])\*\*/g,
				component: (content) =>
					React.createElement('strong', null, content),
			},
			{
				// Italic
				pattern: /\*([^\s*][^*]*[^\s*])\*/g,
				component: (content) =>
					React.createElement('em', null, content),
			},
			{
				// Strikethrough
				pattern: /~~([^\s~][^~]*[^\s~])~~/g,
				component: (content) => React.createElement('s', null, content),
			},
		];

		let elements = [text];

		rules.forEach(({ pattern, component }) => {
			elements = elements.flatMap((element) => {
				if (typeof element !== 'string') return element;

				const parts = [];
				let lastIndex = 0;
				let match;

				while ((match = pattern.exec(element)) !== null) {
					// Add preceding text
					if (match.index > lastIndex) {
						parts.push(element.slice(lastIndex, match.index));
					}

					// Add formatted element
					parts.push(component(match[1].trim()));
					lastIndex = match.index + match[0].length;
				}

				// Add remaining text
				if (lastIndex < element.length) {
					parts.push(element.slice(lastIndex));
				}

				return parts;
			});
		});

		return elements;
	};

	lines.forEach((line, index) => {
		const key = `line-${index}`;

		// Handle code blocks
		if (line.startsWith('```')) {
			if (inCodeBlock) {
				elements.push(
					React.createElement(
						'pre',
						{
							key: `code-${elements.length}`,
							className:
								'bg-gray-700 p-4 rounded my-2 font-mono overflow-x-auto',
						},
						React.createElement(
							'code',
							null,
							codeBlockContent.join('\n')
						)
					)
				);
				codeBlockContent = [];
				inCodeBlock = false;
				return;
			}
			inCodeBlock = true;
			return;
		}

		if (inCodeBlock) {
			codeBlockContent.push(line);
			return;
		}

		// Block elements
		if (line.startsWith('# ')) {
			elements.push(
				React.createElement(
					'h1',
					{ key, className: 'text-2xl font-bold mb-2' },
					parseInline(line.slice(2))
				)
			);
		} else if (line.startsWith('## ')) {
			elements.push(
				React.createElement(
					'h2',
					{ key, className: 'text-xl font-semibold mb-2' },
					parseInline(line.slice(3))
				)
			);
		} else if (line.startsWith('### ')) {
			elements.push(
				React.createElement(
					'h3',
					{ key, className: 'text-lg font-medium mb-2' },
					parseInline(line.slice(4))
				)
			);
		} else if (line.startsWith('- ')) {
			elements.push(
				React.createElement(
					'li',
					{ key, className: 'ml-4 list-disc mb-1' },
					parseInline(line.slice(2))
				)
			);
		} else if (line.startsWith('> ')) {
			elements.push(
				React.createElement(
					'blockquote',
					{
						key,
						className:
							'border-l-4 border-gray-500 pl-4 my-2 italic text-gray-300',
					},
					parseInline(line.slice(2))
				)
			);
		} else if (line.trim() === '') {
			elements.push(React.createElement('br', { key }));
		} else {
			elements.push(
				React.createElement(
					'p',
					{ key, className: 'text-base mb-2' },
					parseInline(line)
				)
			);
		}
	});

	return elements;
};

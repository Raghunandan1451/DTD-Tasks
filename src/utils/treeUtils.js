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
export const parseMarkdown = (markdown) => {
	const lines = markdown.split('\n');
	const elements = [];
	let inCodeBlock = false;
	let codeBlockContent = [];
	let codeBlockId = 0;

	// Element creation helper
	const createElement = (type, props, ...children) => ({
		type,
		props: props || {},
		children: children.flat(),
	});

	// Inline formatting rules
	const parseInline = (text, lineIndex) => {
		const rules = [
			{
				// Bold: **text**
				pattern: /\*\*(\S(?:.*?\S)?)\*\*/g,
				element: (content, key) =>
					createElement('strong', { key }, content),
			},
			{
				// Underline: __text__
				pattern: /__(\S(?:.*?\S)?)__/g,
				element: (content, key) => createElement('u', { key }, content),
			},
			{
				// Italic: *text*
				pattern: /\*(\S(?:.*?\S)?)\*/g,
				element: (content, key) =>
					createElement('em', { key }, content),
			},
			{
				// Strikethrough: ~~text~~
				pattern: /~~(\S(?:.*?\S)?)~~/g,
				element: (content, key) => createElement('s', { key }, content),
			},
			{
				// Code: `text`
				pattern: /`(\S(?:.*?\S)?)`/g,
				element: (content, key) =>
					createElement(
						'code',
						{
							key,
							className: 'bg-gray-700 px-1 rounded',
						},
						content
					),
			},
		];

		return rules.reduce(
			(elements, rule, ruleIndex) => {
				return elements.flatMap((element) => {
					if (typeof element !== 'string') return [element];

					const parts = [];
					let lastIndex = 0;
					let matchCount = 0;
					let match; // Properly declared here

					rule.pattern.lastIndex = 0; // Reset regex state

					while ((match = rule.pattern.exec(element)) !== null) {
						if (match.index > lastIndex) {
							parts.push(element.slice(lastIndex, match.index));
						}

						const key = `${lineIndex}-${ruleIndex}-${matchCount++}`;
						parts.push(rule.element(match[1], key));
						lastIndex = rule.pattern.lastIndex;
					}

					if (lastIndex < element.length) {
						parts.push(element.slice(lastIndex));
					}

					return parts;
				});
			},
			[text]
		);
	};

	// Process each line
	lines.forEach((line, lineIndex) => {
		const lineKey = `line-${lineIndex}-${line.replace(/\W/g, '')}`;
		let content = line;
		let elementType = 'p'; // Default to paragraph

		// Handle block elements and strip Markdown syntax
		if (line.startsWith('# ')) {
			elementType = 'h1';
			content = line.slice(2); // Remove '# '
		} else if (line.startsWith('## ')) {
			elementType = 'h2';
			content = line.slice(3); // Remove '## '
		} else if (line.startsWith('### ')) {
			elementType = 'h3';
			content = line.slice(4); // Remove '### '
		} else if (line.startsWith('- ')) {
			elementType = 'li';
			content = line.slice(2); // Remove '- '
		} else if (line.startsWith('> ')) {
			elementType = 'blockquote';
			content = line.slice(2); // Remove '> '
		} else if (line.trim() === '') {
			elementType = 'br';
			content = '';
		}

		// Parse inline formatting for non-break elements
		const processedContent =
			elementType === 'br' ? [] : parseInline(content, lineIndex);

		elements.push(
			createElement(
				elementType,
				{
					key: lineKey,
					className: {
						h1: 'text-2xl font-bold mb-2',
						h2: 'text-xl font-semibold mb-2',
						h3: 'text-lg font-medium mb-2',
						li: 'ml-4 list-disc mb-1',
						blockquote:
							'border-l-4 border-gray-500 pl-4 my-2 italic text-gray-300',
						p: 'text-base mb-2',
					}[elementType],
				},
				...processedContent
			)
		);
	});

	return elements;
};

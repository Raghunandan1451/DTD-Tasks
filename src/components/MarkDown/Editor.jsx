import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateFileContent } from '@store/markdownSlice';

// Parse Markdown while dimming syntax like `**` or `*`
const parseMarkdown = (content) => {
	const parsedContent = content
		.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.*?)\*/g, '<em>$1</em>')
		.replace(/~~(.*?)~~/g, '<del>$1</del>')
		.replace(/`(.*?)`/g, '<code>$1</code>')
		.replace(/#{3,}\s*(.*?)$/gm, '<h3>$1</h3>')
		.replace(/##\s*(.*?)$/gm, '<h2>$1</h2>')
		.replace(/#\s*(.*?)$/gm, '<h1>$1</h1>');

	return parsedContent;
};

const Editor = () => {
	const { content, selectedFile } = useSelector((state) => state.fileManager);
	const dispatch = useDispatch();

	if (!selectedFile) {
		return (
			<div className="flex-1 flex items-center justify-center">
				Select a file to edit
			</div>
		);
	}

	return (
		<div className="flex-1">
			<textarea
				value={content}
				onChange={(e) => dispatch(updateFileContent(e.target.value))}
				className="w-full h-full bg-gray-900 text-white p-4 font-mono text-sm resize-none"
				placeholder="Write your markdown here..."
			/>
			<div
				className="p-4 bg-gray-800 text-white prose"
				dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
			/>
		</div>
	);
};

export default Editor;

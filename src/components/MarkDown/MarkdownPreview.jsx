// components/MarkdownPreview.jsx
import { useSelector } from 'react-redux';
import { parseMarkdown } from '@utils/parseMarkdown';
import { useEffect, useRef } from 'react';

const MarkdownPreview = () => {
	const { content } = useSelector((state) => state.fileManager);
	const containerRef = useRef(null);

	// Automatically scroll to bottom when content changes
	useEffect(() => {
		if (containerRef.current) {
			const { scrollHeight, clientHeight } = containerRef.current;
			containerRef.current.scrollTop = scrollHeight - clientHeight;
		}
	}, [content]);
	return (
		<div
			ref={containerRef}
			className="flex-1 overflow-y-auto p-2 bg-gray-700 rounded-sm mb-4 scrollbar-hide">
			{parseMarkdown(content)}
		</div>
	);
};

export default MarkdownPreview;

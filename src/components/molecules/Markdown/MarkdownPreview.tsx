import React, { useEffect, useRef } from 'react';

import { useSelector } from 'react-redux';
import { parseMarkdown } from '@src/utils/parseMarkdown';
import { RootState } from '@src/store/store';

const MarkdownPreview: React.FC = () => {
	const { content } = useSelector((state: RootState) => state.fileManager);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (containerRef.current) {
			const { scrollHeight, clientHeight } = containerRef.current;
			containerRef.current.scrollTop = scrollHeight - clientHeight;
		}
	}, [content]);

	return (
		<div
			data-testid="markdown-preview"
			ref={containerRef}
			className="flex-1 overflow-y-auto p-2 bg-gray-700 rounded-sm mb-4">
			{parseMarkdown(content)}
		</div>
	);
};

export default MarkdownPreview;

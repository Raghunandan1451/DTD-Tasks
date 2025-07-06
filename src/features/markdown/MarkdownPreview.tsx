import React, { useEffect, useRef } from "react";

import { useSelector } from "react-redux";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";
import { RootState } from "@src/lib/store/store";

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
			className="flex-1 overflow-y-auto p-2 bg-white/20 dark:bg-black/20 rounded-sm mb-4 backdrop-blur-sm"
		>
			{parseMarkdown(content)}
		</div>
	);
};

export default MarkdownPreview;

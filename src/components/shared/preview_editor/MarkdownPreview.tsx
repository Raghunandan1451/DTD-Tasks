import React, { useEffect, useRef } from "react";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";

interface MarkdownPreviewProps {
	content: string;
	containerRef?: React.RefObject<HTMLDivElement | null>; // Made optional
	onScroll?: () => void;
	enableAutoScroll?: boolean;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
	content,
	containerRef: externalRef,
	onScroll,
	enableAutoScroll = false,
}) => {
	const internalRef = useRef<HTMLDivElement>(null);
	const containerRef = externalRef || internalRef;

	// Fix: Wrap in useCallback or exclude from deps (containerRef is stable)
	useEffect(() => {
		if (enableAutoScroll && containerRef.current) {
			const { scrollHeight, clientHeight } = containerRef.current;
			containerRef.current.scrollTop = scrollHeight - clientHeight;
		}
		// containerRef is stable (doesn't change), so it's safe to omit
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [content, enableAutoScroll]);

	return (
		<div
			data-testid="markdown-preview"
			ref={containerRef}
			onScroll={onScroll}
			className="h-full overflow-y-auto p-2 rounded-sm backdrop-blur-xs scrollbar-hide"
		>
			{parseMarkdown(content)}
		</div>
	);
};

export default MarkdownPreview;

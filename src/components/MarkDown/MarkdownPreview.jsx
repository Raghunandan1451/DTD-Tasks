// components/MarkdownPreview.jsx
import { useSelector } from 'react-redux';
import { parseMarkdown } from '@utils/parseMarkdown';

const MarkdownPreview = () => {
	const { content } = useSelector((state) => state.fileManager);

	return (
		<div className="flex-1 overflow-y-auto p-2 bg-gray-700 rounded mb-4">
			{parseMarkdown(content)}
		</div>
	);
};

export default MarkdownPreview;

import { useSelector, useDispatch } from 'react-redux';
import { updateFileContent } from '@store/markdownSlice';
import MarkdownPreview from '@components/MarkDown/MarkdownPreview';

const Editor = () => {
	const dispatch = useDispatch();
	const { selectedFile, content } = useSelector((state) => state.fileManager);
	// Changed: Use full path string instead of file object
	const handleContentChange = (e) => {
		if (!selectedFile) return;
		dispatch(
			updateFileContent({
				path: selectedFile, // Now using the full path string directly
				content: e.target.value,
			})
		);
	};
	if (!selectedFile) {
		return (
			<div className="flex-1 flex items-center justify-center bg-gray-800 text-gray-400">
				<p>Select a file to start editing</p>
			</div>
		);
	}
	return (
		<div className="flex-1 p-2 bg-gray-800 text-white flex flex-col min-h-0">
			<h2 className="text-lg font-bold mb-4 break-all">
				{selectedFile || 'No file selected'}
			</h2>
			<MarkdownPreview />
			<textarea
				className="w-full bg-gray-700 text-white border-none outline-none rounded p-2 scrollbar-hide resize-none"
				value={content}
				onChange={handleContentChange}
				placeholder="Start writing Markdown..."
				rows={3}
				autoFocus
			/>
		</div>
	);
};

export default Editor;

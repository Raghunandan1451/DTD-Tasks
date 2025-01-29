import { useSelector, useDispatch } from 'react-redux';
import { updateFileContent } from '@store/markdownSlice';
import { parseMarkdown } from '@utils/treeUtils';

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
		<div className="flex-1 p-2 bg-gray-800 text-white flex flex-col">
			{/* Changed: Display full path directly */}
			<h2 className="text-lg font-bold mb-4 break-all">
				{selectedFile || 'No file selected'}
			</h2>

			{/* Improved: Remove unnecessary <ul> wrapper */}
			<div className="flex-1 overflow-y-auto p-2 bg-gray-700 rounded mb-4">
				{parseMarkdown(content)}
			</div>

			{/* Improved: Better textarea sizing */}
			<textarea
				className="w-full min-h-[150px] bg-gray-700 text-white border-none outline-none rounded p-2 resize-y"
				value={content}
				onChange={handleContentChange}
				placeholder="Start writing Markdown..."
			/>
		</div>
	);
};

export default Editor;

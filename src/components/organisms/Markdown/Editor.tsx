import Textarea from '@src/components/atoms/TextBox/Textarea';
import MarkdownPreview from '@src/components/molecules/Markdown/MarkdownPreview';
import { updateFileContent } from '@src/store/markdownSlice';
import { RootState } from '@src/store/store';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

const Editor: React.FC = () => {
	const { selectedFile, content } = useSelector(
		(state: RootState) => state.fileManager
	);
	const dispatch = useDispatch();

	const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (!selectedFile) return;
		dispatch(
			updateFileContent({ path: selectedFile, content: e.target.value })
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
			<Textarea
				className="w-full bg-gray-700 text-white rounded-sm p-2 scrollbar-hide"
				value={content}
				onChange={handleContentChange}
			/>
		</div>
	);
};

export default Editor;

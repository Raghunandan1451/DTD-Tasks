import Textarea from "@src/components/ui/textbox/Textarea";
import MarkdownPreview from "@src/features/markdown/MarkdownPreview";
import { updateFileContent } from "@src/lib/store/slices/markdownSlice";
import { RootState } from "@src/lib/store/store";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

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
			<div className="flex-1 flex items-center justify-center">
				<p>Select a file to start editing</p>
			</div>
		);
	}

	return (
		<div className="flex-1 p-2 bg-white/30 dark:bg-black/30 text-gray-900 dark:text-gray-100 backdrop-blur-md shadow-sm flex flex-col min-h-0">
			<h2 className="text-lg font-bold mb-4 break-all">
				{selectedFile || "No file selected"}
			</h2>
			<MarkdownPreview />
			<Textarea
				className="bg-transparent outline-none resize-none w-full text-gray-900 dark:text-gray-100 placeholder-gray-700 dark:placeholder-gray-500 rounded-sm p-2 scrollbar-hide"
				value={content}
				onChange={handleContentChange}
			/>
		</div>
	);
};

export default Editor;

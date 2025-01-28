import { useSelector } from 'react-redux';

const Editor = () => {
	const { selectedFile, content } = useSelector((state) => state.fileManager);

	if (!selectedFile) {
		return (
			<div className="flex-1 flex items-center justify-center bg-gray-800 text-gray-400">
				<p>Select a file to start editing</p>
			</div>
		);
	}

	return (
		<div className="flex-1 p-4 bg-gray-800 text-white">
			<h2 className="text-lg font-bold mb-4">{selectedFile.path}</h2>
			<textarea
				className="w-full h-full bg-gray-700 text-white border-none outline-none rounded p-2 resize-none"
				value={content}
				readOnly
			/>
		</div>
	);
};

export default Editor;

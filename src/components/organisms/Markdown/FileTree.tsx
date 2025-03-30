import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '@src/components/atoms/Button/Button';
import TreeView from '@src/components/organisms/Markdown/TreeView';

const FileTree: React.FC = () => {
	const [showInput, setShowInput] = useState<boolean>(false);

	// const sortedFiles = sortFilesAlphabetically(files);

	return (
		<div className="w-65 border-r bg-gray-800 flex flex-col max-h-[calc(100vh-4rem)]">
			<div className="p-4 border-b flex justify-around">
				<Button
					onClick={() => setShowInput(true)}
					className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-sm flex items-center gap-2"
					text="Add File">
					<Plus size={16} />
				</Button>
			</div>

			<TreeView showInput={showInput} setShowInput={setShowInput} />
		</div>
	);
};

export default FileTree;

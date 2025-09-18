import React, { useState } from "react";
import { Plus } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import TreeView from "@src/features/markdown/TreeView";

const FileTree: React.FC = () => {
	const [showInput, setShowInput] = useState<boolean>(false);

	return (
		<div className="border-r border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30 backdrop-blur-md shadow-sm flex flex-col max-h-full rounded-bl-xl">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-around">
				<Button
					onClick={() => setShowInput(true)}
					className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-sm flex items-center gap-2 shadow-md"
					text="Add File"
				>
					<Plus size={16} />
				</Button>
			</div>

			<TreeView showInput={showInput} setShowInput={setShowInput} />
		</div>
	);
};

export default FileTree;

import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import React from "react";

interface EditFileFolderProps {
	renameValue: string;
	setShowRenameInput: (show: boolean) => void;
	setRenameValue: (value: string) => void;
	onEdit: () => void;
}

const EditFileFolder: React.FC<EditFileFolderProps> = ({
	renameValue,
	setShowRenameInput,
	setRenameValue,
	onEdit,
}) => {
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm z-50">
			<div className="bg-white/30 dark:bg-black/30 backdrop-blur-lg p-6 rounded-xl shadow-2xl w-72 text-center border border-white/20 dark:border-white/10">
				<Input
					id="md-modal-input-edit"
					value={renameValue}
					onChange={(e) => setRenameValue(e.target.value)}
					className="w-full mb-4 p-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white/20 dark:bg-gray-800/30 rounded-md backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-green-400"
					placeholder="Enter new name"
				/>
				<div className="flex justify-center mt-3 gap-2">
					<Button
						onClick={onEdit}
						className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors shadow-md"
						text="Rename"
					/>
					<Button
						onClick={() => (
							setShowRenameInput(false), setRenameValue("")
						)}
						className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md transition-colors shadow-md"
						text="Cancel"
					/>
				</div>
			</div>
		</div>
	);
};

export default EditFileFolder;

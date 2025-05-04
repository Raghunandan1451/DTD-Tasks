import Button from '@src/components/atoms/Button/Button';
import Input from '@src/components/atoms/Input/Input';
import React from 'react';

interface CreateFileFolderProps {
	setShowInput: (value: boolean) => void;
	newFilePath: string;
	setNewFilePath: (path: string) => void;
	onCreate: () => void;
}

const CreateFileFolder: React.FC<CreateFileFolderProps> = ({
	setShowInput,
	newFilePath,
	setNewFilePath,
	onCreate,
}) => {
	return (
		<div
			data-testid="modal-overlay"
			className="fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm z-50"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					setShowInput(false);
				}
			}}>
			<div className="bg-white/30 dark:bg-black/30 backdrop-blur-lg p-6 rounded-xl shadow-2xl w-72 text-center border border-white/20 dark:border-white/10">
				<Input
					id="md-modal-input-create"
					className="w-full mb-4 p-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white/20 dark:bg-gray-800/30 rounded-md backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-green-400"
					value={newFilePath}
					onChange={(e) => setNewFilePath(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							onCreate();
						}
					}}
					placeholder="Enter folder/file name"
				/>
				<Button
					onClick={onCreate}
					text="Create"
					className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors shadow-md"
				/>
			</div>
		</div>
	);
};

export default CreateFileFolder;

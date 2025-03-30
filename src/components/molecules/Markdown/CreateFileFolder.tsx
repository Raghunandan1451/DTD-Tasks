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
			className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					setShowInput(false);
				}
			}}>
			<div className="bg-gray-600 p-6 rounded-lg shadow-lg w-72 text-center">
				<Input
					id="md-modal-input-create"
					className="w-full bg-gray-700 text-white p-2 rounded-sm"
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
					className="mt-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-sm"
				/>
			</div>
		</div>
	);
};

export default CreateFileFolder;

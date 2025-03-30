import Button from '@src/components/atoms/Button/Button';
import Input from '@src/components/atoms/Input/Input';
import React from 'react';

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
		<div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
			<div className="bg-gray-600 p-6 rounded-lg shadow-lg w-72 text-center">
				<Input
					id="md-modal-input-edit"
					value={renameValue}
					onChange={(e) => setRenameValue(e.target.value)}
					className="w-full bg-gray-700 text-white p-2 rounded-sm"
					placeholder="Enter new name"
				/>
				<div className="flex justify-center mt-3 gap-2">
					<Button
						onClick={onEdit}
						className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-sm"
						text="Rename"
					/>
					<Button
						onClick={() => (
							setShowRenameInput(false), setRenameValue('')
						)}
						className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-sm"
						text="Cancel"
					/>
				</div>
			</div>
		</div>
	);
};

export default EditFileFolder;

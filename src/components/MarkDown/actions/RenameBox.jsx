const RenameBox = ({
	renameValue,
	setShowRenameInput,
	setRenameValue,
	onRename,
}) => {
	return (
		<div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
			<div className="bg-gray-600 p-6 rounded-lg shadow-lg w-72 text-center">
				<input
					type="text"
					value={renameValue}
					onChange={(e) => setRenameValue(e.target.value)}
					className="w-full bg-gray-700 text-white p-2 rounded"
					placeholder="Enter new name"
					autoFocus
				/>
				<div className="flex justify-center mt-3 gap-2">
					<button
						onClick={onRename}
						className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
						Rename
					</button>
					<button
						onClick={() => {
							setShowRenameInput(false);
							setRenameValue(''); // Clear input
						}}
						className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};

export default RenameBox;

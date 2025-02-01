const CreateBox = ({ setShowInput, newFilePath, setNewFilePath, onCreate }) => {
	return (
		<div
			className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					setShowInput(false);
				}
			}}>
			<div className="bg-gray-600 p-6 rounded-lg shadow-lg w-72 text-center">
				<input
					type="text"
					value={newFilePath}
					onChange={(e) => setNewFilePath(e.target.value)}
					className="w-full bg-gray-700 text-white p-2 rounded"
					placeholder="Enter file path"
					autoFocus
				/>
				<button
					onClick={onCreate}
					className="mt-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
					Create
				</button>
			</div>
		</div>
	);
};

export default CreateBox;

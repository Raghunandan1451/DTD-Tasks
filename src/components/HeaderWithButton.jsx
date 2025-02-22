const HeaderWithButton = (props) => {
	const { heading, onDownload, buttonText } = props;
	return (
		<div className="flex place-content-between place-items-center p-2">
			<h1 className="text-4xl font-bold">{heading}</h1>
			<button
				type="button"
				className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-sm"
				onClick={() => onDownload(heading)}>
				{buttonText}
			</button>
		</div>
	);
};

export default HeaderWithButton;

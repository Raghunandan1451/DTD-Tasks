import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import HeaderWithButton from '@components/HeaderWithButton';
import QRCodeSettings from '@components/QRCode/QRCodeSettings';
import { useSelector } from 'react-redux';

const QRCodeGenerator = () => {
	// const qrSize = 200;
	const [input, setInput] = useState('');
	const [qrData, setQrData] = useState('');
	const settings = useSelector((state) => state.qrSetting);

	console.log(settings);
	const handleInputChange = (e) => {
		setInput(e.target.value);
	};

	const handleGenerate = () => {
		if (input.trim() === '') {
			alert('Input cannot be empty!');
			return;
		}
		setQrData(input); // Set the input value for QR code generation
	};

	const handleDownload = () => {
		if (!qrData) {
			alert('Please generate a QR code before downloading!');
			return;
		}
		const canvas = document.querySelector('canvas'); // Select the QR code canvas

		const url = canvas.toDataURL('image/png');
		const link = document.createElement('a');
		link.href = url;
		link.download = 'qr-code.png';
		link.click();
	};

	return (
		<div className="flex flex-col">
			<HeaderWithButton
				heading="To-Do List"
				onDownload={handleDownload}
			/>
			<div className="flex flex-col items-center mt-6 space-y-4">
				<div className="flex items-center space-x-4">
					<input
						type="text"
						placeholder="Enter URL or Text"
						value={input}
						onChange={handleInputChange}
						className="border border-gray-300 rounded-md px-4 py-2 w-72 focus:outline-none "
					/>
					<button
						onClick={handleGenerate}
						className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 focus:outline-none">
						Generate
					</button>
				</div>

				<QRCodeSettings />

				<div className="rounded-lg">
					{qrData && (
						<QRCodeCanvas
							value={qrData}
							size={300}
							marginSize={1}
							bgColor={settings.bgColor}
							fgColor={settings.fgColor}
							imageSettings={{
								src: settings.selectedIcon, // Replace with your icon URL
								x: null,
								y: null,
								height: 40,
								width: 40,
								excavate: true,
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default QRCodeGenerator;

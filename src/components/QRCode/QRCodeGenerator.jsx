import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import HeaderWithButton from '@components/HeaderWithButton';
import QRCodeSettings from '@components/QRCode/QRCodeSettings';
import { useSelector } from 'react-redux';
import NotificationCenter from '@components/NotificationCeter';
import useNotifications from '@src/hooks/useNotifications';
import { handleDownloadImage } from '@src/utils/downloadList';

const QRCodeGenerator = () => {
	// const qrSize = 200;
	const [input, setInput] = useState('');
	const [qrData, setQrData] = useState('');
	const { notifications, showNotification } = useNotifications();
	const settings = useSelector((state) => state.qrSetting);

	const handleInputChange = (e) => {
		setInput(e.target.value);
	};

	const handleGenerate = () => {
		if (input.trim() === '') {
			showNotification('Input cannot be empty!', 'error');
			return;
		}
		setQrData(input); // Set the input value for QR code generation
	};

	return (
		<div className="flex flex-col">
			<HeaderWithButton
				heading="To-Do List"
				onDownload={() => handleDownloadImage(qrData, showNotification)}
				buttonText="Download Image"
			/>
			<div className="flex flex-col items-center mt-6 space-y-12">
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

				<div className="flex w-full items-start justify-center relative mt-2">
					{/* QR Code Centered */}
					<div className="flex justify-center items-center">
						{qrData && (
							<QRCodeCanvas
								value={qrData}
								size={300}
								marginSize={1}
								bgColor={settings.bgColor}
								fgColor={settings.fgColor}
								imageSettings={{
									src: settings.selectedIcon,
									x: null,
									y: null,
									height: 40,
									width: 40,
									excavate: true,
								}}
							/>
						)}
					</div>

					{/* Settings Panel Sticks to Right */}
					<div className="absolute right-5">
						<QRCodeSettings />
					</div>
				</div>

				<NotificationCenter notifications={notifications} />
			</div>
		</div>
	);
};

export default QRCodeGenerator;

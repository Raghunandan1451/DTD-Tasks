import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import HeaderWithButton from '@components/HeaderWithButton';
import QRCodeSettings from '@components/QRCode/QRCodeSettings';
import { useDispatch, useSelector } from 'react-redux';
import NotificationCenter from '@components/NotificationCeter';
import useNotifications from '@src/hooks/useNotifications';
import { handleDownloadImage } from '@src/utils/downloadList';
import { updateSettings } from '@store/qrSettingSlice';

const QRCodeGenerator = () => {
	const qrRef = useRef();
	const dispatch = useDispatch();
	const [input, setInput] = useState('');
	const { notifications, showNotification } = useNotifications();
	const settings = useSelector((state) => state.qr);

	const handleInputChange = (e) => {
		setInput(e.target.value);
	};

	const handleGenerate = () => {
		if (input.trim() === '') {
			showNotification('Input cannot be empty!', 'error');
			return;
		}
		dispatch(updateSettings({ qrData: input }));
	};

	return (
		<div className="flex flex-col">
			<HeaderWithButton
				heading="QR Code Generator"
				onDownload={() =>
					handleDownloadImage(
						settings.qrData,
						qrRef.current,
						showNotification
					)
				}
				buttonText="Download Image"
			/>
			<div className="flex flex-col items-center mt-6 space-y-12">
				<div className="flex items-center space-x-4">
					<input
						type="text"
						placeholder="Enter URL or Text"
						value={input}
						onChange={handleInputChange}
						className="border border-gray-300 rounded-md px-4 py-2 w-72 focus:outline-hidden "
					/>
					<button
						onClick={handleGenerate}
						className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 focus:outline-hidden">
						Generate
					</button>
				</div>

				<div className="flex w-full items-start justify-center relative mt-2">
					{/* QR Code Centered */}
					<div className="flex justify-center items-center">
						{settings.qrData && (
							<QRCodeCanvas
								ref={qrRef}
								value={settings.qrData}
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

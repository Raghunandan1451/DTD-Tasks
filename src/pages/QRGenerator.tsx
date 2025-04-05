import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import TitleWithButton from '@src/components/molecules/Header/TitleWithButton';
import QRCodeSettings from '@src/components/organisms/QRCode/QRCodeSettings';
import { useDispatch, useSelector } from 'react-redux';
import NotificationCenter from '@src/components/organisms/Notifications/NotificationCenter';
import useNotifications from '@src/hooks/useNotifications';
import { handleDownloadImage } from '@src/utils/downloadHandler';
import { updateSettings } from '@src/store/qrSettingSlice';
import { RootState } from '@src/store/store';
import Button from '@src/components/atoms/Button/Button';
import Input from '@src/components/atoms/Input/Input';

const QRGenerator: React.FC = () => {
	const qrRef = useRef<HTMLCanvasElement | null>(null);
	const dispatch = useDispatch();
	const [input, setInput] = useState<string>('');
	const { notifications, showNotification } = useNotifications();
	const settings = useSelector((state: RootState) => state.qr);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInput(e.target.value);
	};

	const handleGenerate = () => {
		if (input.trim() === '') {
			showNotification('Please enter a valid input', 'error');
			return;
		}
		dispatch(updateSettings({ qrData: input }));
	};

	return (
		<div className="flex flex-col">
			<TitleWithButton
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
					<Input
						id="qr-input"
						type="text"
						placeholder="Enter URL or Text"
						value={input}
						onChange={handleInputChange}
						className="border border-gray-300 rounded-md px-4 py-2 w-72 focus:outline-hidden"
					/>
					<Button
						onClick={handleGenerate}
						className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 focus:outline-hidden"
						text="Generate"
					/>
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
								{...(settings.selectedIcon?.trim() !== ''
									? {
											imageSettings: {
												src: settings.selectedIcon,
												x: undefined,
												y: undefined,
												height: 40,
												width: 40,
												excavate: true,
											},
									  }
									: {})}
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

export default QRGenerator;

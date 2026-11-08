import React, { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import QRCodeSettings from "@src/features/qr_generator/QRCodeSettings";
import { useDispatch, useSelector } from "react-redux";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import { handleQRExport } from "@src/lib/utils/downloadHandler";
import { updateSettings } from "@src/lib/store/slices/qrSettingSlice";
import { RootState } from "@src/lib/store/store";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";

const QRGenerator: React.FC = () => {
	const qrContainerRef = useRef<HTMLDivElement | null>(null);
	const dispatch = useDispatch();
	const [input, setInput] = useState<string>("");
	const [imageFormat, setImageFormat] = useState<"png" | "jpg">("png");
	const { notifications, showNotification } = useNotifications();
	const settings = useSelector((state: RootState) => state.qr);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInput(e.target.value);
	};

	const handleGenerate = () => {
		if (input.trim() === "") {
			showNotification("Please enter a valid input", "error");
			return;
		}
		dispatch(updateSettings({ qrData: input }));
	};

	const handleDownload = () => {
		const canvas = qrContainerRef.current?.querySelector("canvas");
		handleQRExport(canvas as HTMLCanvasElement | null, showNotification, imageFormat);
	};

	return (
		<>
			<div className="flex flex-col">
				<TitleWithButton
					heading="QR Code Generator"
					onDownload={handleDownload}
					buttonText="Download"
					containerClass="rounded-bl-xl"
					showUpload={false}
					showNotification={showNotification}
				/>

				<div
					role="group"
					aria-label="Download format"
					className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-800 dark:text-gray-100"
				>
					<span>Download as</span>
					{(["png", "jpg"] as const).map((format) => (
						<Button
							key={format}
							aria-pressed={imageFormat === format}
							onClick={() => setImageFormat(format)}
							className={`rounded-md px-3 py-1 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 ${
								imageFormat === format ? "ring-2 ring-cyan-400" : ""
							}`}
							text={format.toUpperCase()}
						/>
					))}
				</div>

				{/* QRCodeSettings positioned here */}
				<div className="flex justify-center mt-6">
					<QRCodeSettings showNotification={showNotification} />
				</div>

				<div className="flex flex-col items-center mt-6 space-y-12">
					<div className="flex items-center space-x-4">
						<Input
							id="qr-input"
							type="text"
							placeholder="Enter URL or Text"
							value={input}
							onChange={handleInputChange}
							className="w-72 bg-white/10 dark:bg-white/10 text-black dark:text-white px-4 py-2 rounded-lg shadow-md backdrop-blur-md border border-white/20 focus:outline-none placeholder-white/70"
						/>
						<Button
							onClick={handleGenerate}
							className="bg-green-500/80 hover:bg-green-600/80 text-white px-6 py-2 rounded-lg backdrop-blur-md shadow-lg transition"
							text="Generate"
						/>
					</div>

					<div className="flex w-full items-start justify-center relative mt-2">
						<div
							ref={qrContainerRef}
							className="flex justify-center items-center"
						>
							{settings.qrData && (
								<QRCodeCanvas
									value={settings.qrData}
									size={300}
									marginSize={1}
									bgColor={settings.bgColor}
									fgColor={settings.fgColor}
									{...(settings.selectedIcon?.trim() !== ""
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
					</div>
				</div>
			</div>
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default QRGenerator;

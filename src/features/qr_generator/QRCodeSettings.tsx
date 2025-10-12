import React, { ChangeEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateSettings } from "@src/lib/store/slices/qrSettingSlice";
import { RootState } from "@src/lib/store/store";
import Input from "@src/components/ui/input/Input";

interface QRCodeSettingsProps {
	showNotification: (
		message: string,
		type: "success" | "error" | "info"
	) => void;
}

const QRCodeSettings: React.FC<QRCodeSettingsProps> = ({
	showNotification,
}) => {
	const settings = useSelector((state: RootState) => state.qr);
	const dispatch = useDispatch();

	const handleSettingChange = (
		e: ChangeEvent<HTMLSelectElement | HTMLInputElement>
	) => {
		const { name, value } = e.target;
		dispatch(updateSettings({ [name]: value }));
	};

	const handleIconUpload = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const validTypes = ["image/x-icon", "image/png", "image/svg+xml"];
		if (!validTypes.includes(file.type)) {
			showNotification(
				"Please upload a valid .ico, .png, or .svg file",
				"error"
			);
			return;
		}

		const maxSize = 2 * 1024 * 1024;
		if (file.size > maxSize) {
			showNotification("File size must be less than 2MB", "error");
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			const dataUrl = event.target?.result as string;
			dispatch(updateSettings({ selectedIcon: dataUrl }));
			showNotification("Icon uploaded successfully", "success");
		};
		reader.readAsDataURL(file);
	};

	return (
		<div className="w-100 md:w-1/2 flex items-center justify-around bg-white/10 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
			{/* File input for custom icon */}
			<div className="flex flex-col items-center">
				<label
					className="block text-xs font-medium text-gray-700 dark:text-cyan-500 mb-2"
					htmlFor="selectedIcon"
				>
					Icon
				</label>
				<label
					htmlFor="selectedIcon"
					className="inline-block bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold py-2 px-4 rounded-md cursor-pointer transition-colors"
				>
					Choose File
				</label>
				<Input
					id="selectedIcon"
					type="file"
					accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
					onChange={handleIconUpload}
					className="hidden"
				/>
			</div>

			{/* Background Color */}
			<div className="flex flex-col items-center">
				<label
					className="block text-xs font-medium text-gray-700 dark:text-cyan-400 mb-2"
					htmlFor="bgColor"
				>
					Background Color
				</label>
				<Input
					id="bgColor"
					type="color"
					value={settings.bgColor}
					onChange={handleSettingChange}
					className="w-16 h-10 bg-transparent border border-gray-700 dark:border-cyan-500 rounded-md cursor-pointer p-1"
				/>
			</div>

			{/* Foreground Color */}
			<div className="flex flex-col items-center">
				<label
					className="block text-xs font-medium text-gray-700 dark:text-cyan-400 mb-2"
					htmlFor="fgColor"
				>
					Foreground Color
				</label>
				<Input
					id="fgColor"
					type="color"
					value={settings.fgColor}
					onChange={handleSettingChange}
					className="w-16 h-10 bg-transparent border border-gray-700 dark:border-cyan-500 rounded-md cursor-pointer p-1"
				/>
			</div>
		</div>
	);
};

export default QRCodeSettings;

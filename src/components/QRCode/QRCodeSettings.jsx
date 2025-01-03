import { getIconList } from '@utils/svgUtils'; // Import utility
import { useSelector, useDispatch } from 'react-redux';
import { updateSettings } from '@store/qrSettingSlice';

const QRCodeSettings = () => {
	// const { settings } = useQRCodeSettings(); // Use custom hook
	const settings = useSelector((state) => state.qrSetting);
	const dispatch = useDispatch();

	const handleSettingChange = (e) => {
		const { name, value } = e.target;
		dispatch(updateSettings({ [name]: value }));
	};

	return (
		<fieldset className="border p-4 rounded-lg shadow-lg w-full">
			<legend className="text-lg font-semibold text-pink-700">
				Optional Settings
			</legend>

			{/* Dropdown for Icon Selection */}
			<div className="flex justify-around">
				<div>
					<label
						className="block text-sm font-medium text-pink-700 mb-2"
						htmlFor="icon-select">
						Select Icon
					</label>
					<select
						id="icon-select"
						name="selectedIcon" // Use 'name' to target the key in the settings object
						value={settings.selectedIcon}
						onChange={handleSettingChange}
						className="border border-pink-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="">Select Icon</option>
						{getIconList().map((icon, index) => (
							<option key={index} value={icon.src}>
								{icon.name}
							</option>
						))}
					</select>
				</div>
				{/* Color Pickers for Background and Foreground Colors */}
				<div>
					<label
						className="block text-sm font-medium text-pink-700 mb-2"
						htmlFor="bgColor">
						Background Color
					</label>
					<input
						type="color"
						id="bgColor"
						name="bgColor" // Name to target bgColor in settings object
						value={settings.bgColor}
						onChange={handleSettingChange}
						className="w-16 h-10 p-0 border border-pink-300 rounded-md focus:outline-none"
					/>
				</div>
				<div>
					<label
						className="block text-sm font-medium text-pink-700 mb-2"
						htmlFor="fgColor">
						Foreground Color
					</label>
					<input
						type="color"
						id="fgColor"
						name="fgColor" // Name to target fgColor in settings object
						value={settings.fgColor}
						onChange={handleSettingChange}
						className="w-16 h-10 p-0 border border-pink-300 rounded-md focus:outline-none"
					/>
				</div>
			</div>
		</fieldset>
	);
};

export default QRCodeSettings;

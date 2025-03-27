import React, { ChangeEvent } from 'react';
import { getIconList } from '@utils/svgUtils'; // Import utility
import { useSelector, useDispatch } from 'react-redux';
import { updateSettings } from '@store/qrSettingSlice';
import { RootState } from '@store/store';
import Select from '@src/components/atoms/Select/Select';
import Input from '@src/components/atoms/Input/Input';

const QRCodeSettings: React.FC = () => {
	const settings = useSelector((state: RootState) => state.qr);
	const dispatch = useDispatch();

	const handleSettingChange = (
		e: ChangeEvent<HTMLSelectElement | HTMLInputElement>
	) => {
		const { name, value } = e.target;
		dispatch(updateSettings({ [name]: value }));
	};

	return (
		<fieldset className="border p-4 rounded-lg shadow-lg">
			<legend className="text-lg font-semibold text-pink-400">
				Optional Settings
			</legend>

			<div>
				<label
					className="block text-sm font-medium text-pink-400 mb-2"
					htmlFor="icon-select">
					Select Icon
				</label>
				<Select
					id="icon-select"
					value={settings.selectedIcon}
					onChange={handleSettingChange}
					options={getIconList().map((icon) => icon.name)}
					className="border border-pink-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500"
					placeholder="Select Icon"
				/>
			</div>
			{/* Color Pickers for Background and Foreground Colors */}
			<div>
				<label
					className={`block text-sm font-medium text-pink-400 mb-2`}
					htmlFor="bgColor">
					Background Color
				</label>
				<Input
					id="bgColor"
					type="color"
					value={settings.bgColor}
					onChange={handleSettingChange}
					className={`border border-pink-600 focus:ring-2 focus:ring-blue-500 h-10 p-0 rounded-md focus:outline-hidden`}
				/>
			</div>
			<div>
				<label
					className="block text-sm font-medium text-pink-400 mb-2"
					htmlFor="fgColor">
					Foreground Color
				</label>
				<Input
					id="fgColor"
					type="color"
					value={settings.fgColor}
					onChange={handleSettingChange}
					className={`border border-pink-600 focus:ring-2 focus:ring-blue-500 h-10 p-0 rounded-md focus:outline-hidden`}
				/>
			</div>
		</fieldset>
	);
};

export default QRCodeSettings;

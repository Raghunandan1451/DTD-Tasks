import React, { ChangeEvent } from 'react';
import { getIconList } from '@src/utils/svgUtils'; // Import utility
import { useSelector, useDispatch } from 'react-redux';
import { updateSettings } from '@src/store/qrSettingSlice';
import { RootState } from '@src/store/store';
import AdvancedSelect from '@src/components/atoms/Select/AdvancedSelect';
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
					htmlFor="selectedIcon">
					Select Icon
				</label>
				<AdvancedSelect
					id="selectedIcon"
					value={settings.selectedIcon}
					onChange={handleSettingChange}
					options={getIconList()}
					getOptionProps={(option) => ({
						value: option.src,
						label: option.name,
					})}
					className="border border-pink-600 rounded-md px-4 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
					placeholder="Select Icon"
					isDisabled={false}
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
					className={`w-16 h-10 p-0 border border-pink-600 rounded-md focus:outline-hidden`}
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
					className={`w-16 h-10 p-0 border border-pink-600 rounded-md focus:outline-hidden`}
				/>
			</div>
		</fieldset>
	);
};

export default QRCodeSettings;

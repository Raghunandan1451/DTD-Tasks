import React, { ChangeEvent } from "react";
import { getIconList } from "@src/lib/utils/svgUtils"; // Import utility
import { useSelector, useDispatch } from "react-redux";
import { updateSettings } from "@src/lib/store/qrSettingSlice";
import { RootState } from "@src/lib/store/store";
import AdvancedSelect from "@src/components/ui/select_dropdown/AdvancedSelect";
import Input from "@src/components/ui/input/Input";

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
		<fieldset className="border border-white/20 rounded-xl shadow-xl bg-white/10 backdrop-blur-md p-6 space-y-6">
			<legend className="text-lg font-semibold text-gray-700 dark:text-cyan-400 px-2">
				Optional Settings
			</legend>

			<div>
				<label
					className="block text-sm font-medium text-gray-700 dark:text-cyan-500"
					htmlFor="selectedIcon"
				>
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
					className="w-full bg-white/10 text-gray-700 dark:text-white p-2 rounded-md backdrop-blur-md border border-gray-700 dark:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-gray-700 dark:focus:ring-cyan-500"
					placeholder="Select Icon"
					isDisabled={false}
				/>
			</div>
			{/* Color Pickers for Background and Foreground Colors */}
			<div>
				<label
					className={`block text-sm font-medium text-gray-700 dark:text-cyan-400`}
					htmlFor="bgColor"
				>
					Background Color
				</label>
				<Input
					id="bgColor"
					type="color"
					value={settings.bgColor}
					onChange={handleSettingChange}
					className={`w-16 h-10 bg-white/10 border border-gray-700 dark:border-cyan-500 rounded-md backdrop-blur-md focus:outline-none px-0 py-0`}
				/>
			</div>
			<div>
				<label
					className="block text-sm font-medium text-gray-700 dark:text-cyan-400"
					htmlFor="fgColor"
				>
					Foreground Color
				</label>
				<Input
					id="fgColor"
					type="color"
					value={settings.fgColor}
					onChange={handleSettingChange}
					className={`w-16 h-10 bg-white/10 border border-gray-700 dark:border-cyan-500 rounded-md backdrop-blur-md focus:outline-none px-0 py-0`}
				/>
			</div>
		</fieldset>
	);
};

export default QRCodeSettings;

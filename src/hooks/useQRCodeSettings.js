import { useState } from 'react';

export const useQRCodeSettings = () => {
	// Combine the states into a single object
	const [settings, setSettings] = useState({
		selectedIcon: '',
		bgColor: '#ffffff',
		fgColor: '#000000',
	});

	// Handler for changing individual properties in the settings object
	const handleSettingsChange = (e) => {
		const { name, value } = e.target;
		setSettings((prevSettings) => ({
			...prevSettings,
			[name]: value, // Update the specific property
		}));
	};

	return {
		settings,
		handleSettingsChange,
	};
};

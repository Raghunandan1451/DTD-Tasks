import { createSlice } from '@reduxjs/toolkit';
import { getFromLocalStorage } from '@src/utils/persistMiddleware';

interface QrSettings {
	qrData: string;
	selectedIcon: string;
	bgColor: string;
	fgColor: string;
}

export const getInitialState = (): QrSettings => {
	const storedData = getFromLocalStorage<QrSettings>('redux_qr_settings');
	return (
		storedData || {
			qrData: '',
			selectedIcon: '',
			bgColor: '#ffffff',
			fgColor: '#000000',
		}
	);
};

const qrSettingSlice = createSlice({
	name: 'qrSettings',
	initialState: getInitialState(),
	reducers: {
		updateSettings: (state, action: { payload: Partial<QrSettings> }) => ({
			...state,
			...action.payload,
		}),
	},
});

export const { updateSettings } = qrSettingSlice.actions;
export default qrSettingSlice.reducer;

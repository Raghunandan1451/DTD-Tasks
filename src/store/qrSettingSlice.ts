import { createSlice } from '@reduxjs/toolkit';

interface QrSettings {
	qrData: string;
	selectedIcon: string;
	bgColor: string;
	fgColor: string;
}

const initialState: QrSettings = {
	qrData: '',
	selectedIcon: '',
	bgColor: '#ffffff',
	fgColor: '#000000',
};

const qrSettingSlice = createSlice({
	name: 'qrSettings',
	initialState,
	reducers: {
		updateSettings: (state, action: { payload: Partial<QrSettings> }) => ({
			...state,
			...action.payload,
		}),
	},
});

export const { updateSettings } = qrSettingSlice.actions;
export default qrSettingSlice.reducer;

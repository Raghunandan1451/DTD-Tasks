import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	qrData: '',
	selectedIcon: '',
	bgColor: '#ffffff',
	fgColor: '#000000',
};

const qrSettingSlice = createSlice({
	name: 'qrSettings',
	initialState,
	reducers: {
		updateSettings: (state, action) => ({ ...state, ...action.payload }),
	},
});

export const { updateSettings } = qrSettingSlice.actions;
export default qrSettingSlice.reducer;

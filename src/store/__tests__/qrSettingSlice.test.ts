import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import reducer, { updateSettings, getInitialState } from '../qrSettingSlice';
import { getFromLocalStorage } from '../../utils/persistMiddleware';

vi.mock('../../utils/persistMiddleware', () => ({
	getFromLocalStorage: vi.fn(),
}));

const defaultState = {
	qrData: '',
	selectedIcon: '',
	bgColor: '#ffffff',
	fgColor: '#000000',
};

describe('qrSettingSlice', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(getFromLocalStorage as Mock).mockReturnValue(null);
	});

	it('should initialize with default values if no localStorage data', () => {
		expect(getInitialState()).toEqual(defaultState);
	});

	it('should initialize with stored localStorage values if present', () => {
		const stored = {
			qrData: 'https://example.com',
			selectedIcon: 'icon1',
			bgColor: '#ffeecc',
			fgColor: '#112233',
		};
		(getFromLocalStorage as Mock).mockReturnValue(stored);
		expect(getInitialState()).toEqual(stored);
	});

	it('should update QR settings partially', () => {
		const update = { qrData: 'https://google.com', fgColor: '#ff0000' };
		const state = reducer(defaultState, updateSettings(update));
		expect(state).toEqual({
			...defaultState,
			...update,
		});
	});
});

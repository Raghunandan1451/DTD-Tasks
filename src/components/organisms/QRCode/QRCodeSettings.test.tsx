import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import QRCodeSettings from './QRCodeSettings';
import '@testing-library/jest-dom';

// Define the shape of the QR settings state.
interface QRState {
	selectedIcon: string;
	bgColor: string;
	fgColor: string;
}

const initialState: QRState = {
	selectedIcon: 'icon1',
	bgColor: '#ffffff',
	fgColor: '#000000',
};

// Define an action interface for updateSettings.
interface UpdateSettingsAction {
	type: 'qrSettings/updateSettings';
	payload: Partial<QRState>;
}

// A simple reducer for the qr slice that handles updateSettings.
const qrReducer = (
	state: QRState = initialState,
	action: UpdateSettingsAction | { type: string; payload?: undefined }
): QRState => {
	switch (action.type) {
		case 'qrSettings/updateSettings':
			return { ...state, ...action.payload };
		default:
			return state;
	}
};

// Create a Redux store using Redux Toolkit's configureStore.
let store: EnhancedStore;
beforeEach(() => {
	store = configureStore({
		reducer: {
			qr: qrReducer,
		},
	});
});

vi.mock('@src/utils/svgUtils', () => ({
	getIconList: () => [
		{ src: 'icon1', name: 'Icon One' },
		{ src: 'icon2', name: 'Icon Two' },
	],
}));

describe('QRCodeSettings Component', () => {
	it('renders with correct initial values', () => {
		render(
			<Provider store={store}>
				<QRCodeSettings />
			</Provider>
		);

		// Query elements by their labels.
		const selectElement = screen.getByLabelText(
			/select icon/i
		) as HTMLSelectElement;
		expect(selectElement).toBeInTheDocument();
		expect(selectElement.value).toBe('icon1');

		const bgInput = screen.getByLabelText(
			/background color/i
		) as HTMLInputElement;
		expect(bgInput).toBeInTheDocument();
		expect(bgInput.value).toBe('#ffffff');

		const fgInput = screen.getByLabelText(
			/foreground color/i
		) as HTMLInputElement;
		expect(fgInput).toBeInTheDocument();
		expect(fgInput.value).toBe('#000000');
	});

	it('dispatches updateSettings when AdvancedSelect changes', () => {
		const mockDispatch = vi.fn();
		store.dispatch = mockDispatch;

		render(
			<Provider store={store}>
				<QRCodeSettings />
			</Provider>
		);

		const selectElement = screen.getByLabelText(
			/select icon/i
		) as HTMLSelectElement;
		fireEvent.change(selectElement, {
			target: { value: 'icon2', name: 'selectedIcon' },
		});

		expect(mockDispatch).toHaveBeenCalledWith({
			payload: { selectedIcon: 'icon2' },
			type: 'qrSettings/updateSettings',
		});
	});

	it('dispatches updateSettings when background color changes', () => {
		const mockDispatch = vi.fn();
		store.dispatch = mockDispatch;

		render(
			<Provider store={store}>
				<QRCodeSettings />
			</Provider>
		);

		const bgInput = screen.getByLabelText(
			/background color/i
		) as HTMLInputElement;
		fireEvent.change(bgInput, {
			target: { value: '#111111', name: 'bgColor' },
		});

		expect(mockDispatch).toHaveBeenCalledWith({
			payload: { bgColor: '#111111' },
			type: 'qrSettings/updateSettings',
		});
	});

	it('dispatches updateSettings when foreground color changes', () => {
		const mockDispatch = vi.fn();
		store.dispatch = mockDispatch;

		render(
			<Provider store={store}>
				<QRCodeSettings />
			</Provider>
		);

		const fgInput = screen.getByLabelText(
			/foreground color/i
		) as HTMLInputElement;
		fireEvent.change(fgInput, {
			target: { value: '#222222', name: 'fgColor' },
		});

		expect(mockDispatch).toHaveBeenCalledWith({
			payload: { fgColor: '#222222' },
			type: 'qrSettings/updateSettings',
		});
	});
});

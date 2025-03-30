import { Middleware, Action } from '@reduxjs/toolkit';
import { RootState } from '@src/store/store';

// Enhanced storage configuration with expiry times
interface StorageConfig {
	key: string;
	expiryMs: number; // Expiry time in milliseconds
}

// Define storage configuration for each slice
const sliceStorageConfig: Record<string, StorageConfig> = {
	fileManager: {
		key: 'redux_markdown_data',
		expiryMs: 24 * 60 * 60 * 1000, // 24 hours
	},
	qrSettings: {
		key: 'redux_qr_settings',
		expiryMs: 24 * 60 * 60 * 1000, // 24 hours
	},
	shopping: {
		key: 'redux_shopping_data',
		expiryMs: 24 * 60 * 60 * 1000, // 24 hours
	},
	todos: {
		key: 'redux_todo_data',
		expiryMs: 24 * 60 * 60 * 1000, // 24 hours
	},
};

// Generic function to save to localStorage with expiry
const saveToLocalStorage = <T>(
	key: string,
	data: T,
	expiryMs: number
): void => {
	const dataWithExpiry = {
		value: data,
		expiryDate: Date.now() + expiryMs,
	};
	localStorage.setItem(key, JSON.stringify(dataWithExpiry));
};

// Generic function to retrieve from localStorage with expiry check
export const getFromLocalStorage = <T>(key: string): T | null => {
	const data = localStorage.getItem(key);
	if (!data) return null;

	try {
		const parsedData = JSON.parse(data);

		if (parsedData.expiryDate && parsedData.expiryDate < Date.now()) {
			localStorage.removeItem(key);
			return null;
		}

		return parsedData.value as T;
	} catch {
		localStorage.removeItem(key);
		return null;
	}
};

// The middleware implementation
export const persistMiddleware: Middleware =
	(store) => (next) => (action: unknown) => {
		if (!isReduxAction(action)) return next(action);
		const result = next(action);
		if (typeof action.type === 'string') {
			const sliceName = action.type.split('/')[0];

			if (sliceName in sliceStorageConfig) {
				const { key, expiryMs } = sliceStorageConfig[sliceName];
				const state = store.getState();

				if (state && typeof state === 'object') {
					const sliceState = state[sliceName as keyof RootState];
					saveToLocalStorage(key, sliceState, expiryMs);
				}
			}
		}

		return result;
	};

const isReduxAction = (
	action: unknown
): action is Action<string> & { type: string } => {
	return (
		typeof action === 'object' &&
		action !== null &&
		'type' in action &&
		typeof action.type === 'string'
	);
};

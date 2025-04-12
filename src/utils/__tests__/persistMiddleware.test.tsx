import { describe, it, vi, expect, beforeEach, Mock } from 'vitest';
import { persistMiddleware } from '../persistMiddleware';
import { configureStore } from '@reduxjs/toolkit';
import todosReducer from '../../store/todoSlice'; // Replace with actual path
// import { RootState } from '../../store/store';

// Setup mock for localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
	};
})();

Object.defineProperty(global, 'localStorage', {
	value: localStorageMock,
});

describe('persistMiddleware', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it('should store the slice in localStorage with expiry', () => {
		const store = configureStore({
			reducer: {
				todos: todosReducer,
			},
			middleware: (getDefaultMiddleware) =>
				getDefaultMiddleware().concat(persistMiddleware),
		});

		store.dispatch({
			type: 'todos/addTodo',
			payload: { id: '1', text: 'Test', done: false },
		});

		const setItemMock = localStorage.setItem as unknown as Mock;
		expect(setItemMock).toHaveBeenCalledTimes(1);

		const [key, storedValue] = setItemMock.mock.calls[0];
		expect(key).toBe('redux_todo_data');

		const parsed = JSON.parse(storedValue);
		expect(parsed).toHaveProperty('value');
		expect(parsed).toHaveProperty('expiryDate');
		expect(typeof parsed.expiryDate).toBe('number');
		expect(parsed.expiryDate).toBeGreaterThan(Date.now());
	});
});

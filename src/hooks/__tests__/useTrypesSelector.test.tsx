import React from 'react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useTypedSelector } from '../useTypedSelector';
import '@testing-library/jest-dom';

const someSliceReducer = (
	state = { value: 'Hello World' },
	action: { type: string }
) => {
	switch (action.type) {
		default:
			return state;
	}
};

const rootReducer = combineReducers({
	someSlice: someSliceReducer,
});

describe('useTypedSelector', () => {
	it('selects value from store', () => {
		const store = configureStore({
			reducer: rootReducer,
		});

		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<Provider store={store}>{children}</Provider>
		);

		const { result } = renderHook(
			() => useTypedSelector((state) => state.someSlice.value),
			{ wrapper }
		);

		expect(result.current).toBe('Hello World');
	});
});

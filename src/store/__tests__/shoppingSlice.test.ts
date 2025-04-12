import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('@reduxjs/toolkit', async () => {
	const actual = await vi.importActual<typeof import('@reduxjs/toolkit')>(
		'@reduxjs/toolkit'
	);
	return {
		...actual,
		nanoid: vi.fn(() => 'mocked-shopping-id'),
	};
});

vi.mock('../../utils/persistMiddleware', () => ({
	getFromLocalStorage: vi.fn(() => null),
}));

import reducer, { addItem, updateItem, deleteItem } from '../shoppingSlice';
import { nanoid } from '@reduxjs/toolkit';
import { getFromLocalStorage } from '../../utils/persistMiddleware';

const mockId = 'mocked-shopping-id';

const initialItem = {
	uid: mockId,
	productName: '',
	quantity: '',
	unit: '',
};

describe('shoppingSlice', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(getFromLocalStorage as Mock).mockReturnValue(null);
		(nanoid as Mock).mockReturnValue(mockId);
	});

	it('should initialize with default shopping item if no localStorage data', () => {
		const state = reducer(undefined, { type: 'init' });
		expect(state).toHaveLength(1);
		expect(state[0]).toEqual(initialItem);
	});

	it('should add a new shopping item', () => {
		const newItem = {
			productName: 'Apples',
			quantity: '2',
			unit: 'kg',
		};
		const state = reducer([initialItem], addItem(newItem));
		expect(state).toHaveLength(2);
		expect(state[1]).toEqual({ uid: mockId, ...newItem });
	});

	it('should update a shopping item field', () => {
		const state = reducer(
			[initialItem],
			updateItem({
				id: mockId,
				key: 'quantity',
				value: '3',
			})
		);
		expect(state[0].quantity).toBe('3');
	});

	it('should clear data if only one item and it is deleted', () => {
		const state = reducer(
			[initialItem],
			deleteItem({ uid: mockId, length: 1 })
		);
		expect(state).toEqual([
			{ uid: mockId, productName: '', quantity: '', unit: '' },
		]);
	});

	it('should remove item if more than one exists', () => {
		const secondItem = {
			uid: 'another-id',
			productName: 'Bananas',
			quantity: '1',
			unit: 'bunch',
		};
		const state = reducer(
			[initialItem, secondItem],
			deleteItem({ uid: mockId, length: 2 })
		);
		expect(state).toHaveLength(1);
		expect(state[0]).toEqual(secondItem);
	});
});

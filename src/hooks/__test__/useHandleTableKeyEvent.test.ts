import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useHandleTableKeyEvent } from '../useHandleTableKeyEvent'; // adjust path as needed
import { Column, RowData } from '../../components/shared/table';

describe('useHandleTableKeyEvent', () => {
	const columns: Column[] = [
		{ key: 'name', type: 'text', header: 'Name' },
		{ key: 'email', type: 'text', header: 'Email' },
	];
	const mockRow: RowData = {
		uid: '1',
		name: 'John',
		email: 'john@example.com',
	};
	const mockEmptyRow: RowData = { uid: '2', name: '', email: '' };

	it('should call setActiveCell to next cell on Enter', () => {
		const setActiveCell = vi.fn();
		const addRow = vi.fn();
		const deleteRow = vi.fn();

		const { result } = renderHook(() =>
			useHandleTableKeyEvent(
				{ row: 0, col: 0 },
				setActiveCell,
				columns,
				[mockRow],
				addRow,
				deleteRow
			)
		);

		const event = {
			key: 'Enter',
			preventDefault: vi.fn(),
		} as unknown as React.KeyboardEvent<HTMLElement>;

		act(() => {
			result.current(event);
		});

		expect(setActiveCell).toHaveBeenCalledWith({ row: 0, col: 1 });
	});

	it('should add a new row if Enter is pressed on last cell and data is complete', () => {
		const setActiveCell = vi.fn();
		const addRow = vi.fn();
		const deleteRow = vi.fn();

		const { result } = renderHook(() =>
			useHandleTableKeyEvent(
				{ row: 0, col: 1 },
				setActiveCell,
				columns,
				[mockRow],
				addRow,
				deleteRow
			)
		);

		const event = {
			key: 'Enter',
			preventDefault: vi.fn(),
		} as unknown as React.KeyboardEvent<HTMLElement>;

		act(() => {
			result.current(event);
		});

		expect(addRow).toHaveBeenCalled();
		expect(setActiveCell).toHaveBeenCalledWith({ row: 1, col: 0 });
	});

	it('should not add a row if last row is incomplete', () => {
		const setActiveCell = vi.fn();
		const addRow = vi.fn();
		const deleteRow = vi.fn();

		const { result } = renderHook(() =>
			useHandleTableKeyEvent(
				{ row: 0, col: 1 },
				setActiveCell,
				columns,
				[mockEmptyRow],
				addRow,
				deleteRow
			)
		);

		const event = {
			key: 'Enter',
			preventDefault: vi.fn(),
		} as unknown as React.KeyboardEvent<HTMLElement>;

		act(() => {
			result.current(event);
		});

		expect(addRow).not.toHaveBeenCalled();
	});

	it('should call deleteRow and setActiveCell on Delete key with confirmation', () => {
		global.confirm = vi.fn(() => true); // mock confirm as true

		const setActiveCell = vi.fn();
		const addRow = vi.fn();
		const deleteRow = vi.fn();

		const { result } = renderHook(() =>
			useHandleTableKeyEvent(
				{ row: 0, col: 0 },
				setActiveCell,
				columns,
				[mockRow],
				addRow,
				deleteRow
			)
		);

		const event = {
			key: 'Delete',
		} as unknown as React.KeyboardEvent<HTMLElement>;

		act(() => {
			result.current(event);
		});

		expect(deleteRow).toHaveBeenCalledWith({ uid: '1', length: 1 });
		expect(setActiveCell).toHaveBeenCalledWith({ row: 0, col: 0 });
	});
});

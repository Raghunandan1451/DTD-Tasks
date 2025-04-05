import React from 'react';
import '@testing-library/jest-dom';
import { renderHook } from '@testing-library/react';
import { useTableContext } from '../useTableContext'; // Adjust path
import TableContext, { TableContextType } from '../../context/TableContext';
import { describe, it, expect, vi } from 'vitest';

describe('useTableContext', () => {
	const mockContextValue: TableContextType = {
		handleCellDataChange: vi.fn(),
		activeCell: { row: 0, col: 0 },
		setActiveCell: vi.fn(),
		inputRefs: { current: {} },
		cellRef: { current: null },
		showNotification: vi.fn(),
	};

	it('returns context when used inside TableProvider', () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<TableContext.Provider value={mockContextValue}>
				{children}
			</TableContext.Provider>
		);

		const { result } = renderHook(() => useTableContext(), { wrapper });

		expect(result.current).toBe(mockContextValue);
	});

	it('throws error when used outside TableProvider', () => {
		// const { result } = renderHook(() => useTableContext());

		expect(() => {
			renderHook(() => useTableContext());
		}).toThrowError('useTableContext must be used within a TableProvider');
	});
});

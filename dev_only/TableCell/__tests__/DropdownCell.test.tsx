import React from 'react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DropdownCell from '../DropdownCell'; // Adjust the import path as needed
import { useTableContext } from '../../../../hooks/useTableContext';
import '@testing-library/jest-dom';

// Mock the context hook
vi.mock('../../../../hooks/useTableContext', () => ({
	useTableContext: vi.fn(),
}));

// No need to mock SimpleSelect - we'll use the actual component

describe('DropdownCell', () => {
	const mockHandleCellDataChange = vi.fn();
	const mockSetActiveCell = vi.fn();
	const mockInputRefs = { current: {} };

	const defaultProps = {
		column: {
			key: 'status',
			options: ['Not started', 'Pending', 'Completed'],
		},
		row: {
			uid: 'row-1',
			status: 'Pending',
		},
		rowIndex: 1,
		colIndex: 2,
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default context mock implementation
		(useTableContext as Mock).mockReturnValue({
			handleCellDataChange: mockHandleCellDataChange,
			setActiveCell: mockSetActiveCell,
			inputRefs: mockInputRefs,
		});
	});

	it('renders with correct initial values', () => {
		render(<DropdownCell {...defaultProps} />);

		const select = screen.getByRole('combobox');
		expect(select).toBeInTheDocument();
		expect(select).toHaveValue('Pending');
	});

	it('renders with empty value when row data is missing', () => {
		const props = {
			...defaultProps,
			row: {
				uid: 'row-1',
				// status is missing
			},
		};

		render(<DropdownCell {...props} />);

		const select = screen.getByRole('combobox');
		expect(select).toHaveValue('');
	});

	it('calls handleCellDataChange when value changes', () => {
		render(<DropdownCell {...defaultProps} />);

		const select = screen.getByRole('combobox');
		fireEvent.change(select, { target: { value: 'Completed' } });

		expect(mockHandleCellDataChange).toHaveBeenCalledWith(
			defaultProps.row.uid,
			defaultProps.column.key,
			'Completed'
		);
	});

	it('sets active cell on focus', () => {
		render(<DropdownCell {...defaultProps} />);

		const select = screen.getByRole('combobox');
		fireEvent.focus(select);

		expect(mockSetActiveCell).toHaveBeenCalledWith({
			row: defaultProps.rowIndex,
			col: defaultProps.colIndex,
		});
	});

	it('stores ref in inputRefs', () => {
		render(<DropdownCell {...defaultProps} />);

		// Check if the ref was set
		expect(mockInputRefs.current).toHaveProperty(
			`${defaultProps.rowIndex}-${defaultProps.colIndex}`
		);
	});

	describe('Enter key behavior', () => {
		it('stops propagation on first Enter and increases counter', () => {
			render(<DropdownCell {...defaultProps} />);

			const select = screen.getByRole('combobox');

			// Set the DOM element as active
			Object.defineProperty(document, 'activeElement', {
				writable: true,
				value: select,
			});

			// Set the ref to match the active element for isSelectFocused check
			mockInputRefs.current[
				`${defaultProps.rowIndex}-${defaultProps.colIndex}`
			] = select;

			const enterEvent = new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
			});
			const stopPropagationSpy = vi.spyOn(enterEvent, 'stopPropagation');

			fireEvent(select, enterEvent);

			expect(stopPropagationSpy).toHaveBeenCalled();
		});

		it('allows normal propagation after third Enter', async () => {
			render(<DropdownCell {...defaultProps} />);

			const select = screen.getByRole('combobox');

			// Set the DOM element as active
			Object.defineProperty(document, 'activeElement', {
				writable: true,
				value: select,
			});

			// Set the ref to match the active element for isSelectFocused check
			mockInputRefs.current[
				`${defaultProps.rowIndex}-${defaultProps.colIndex}`
			] = select;

			// First Enter
			const firstEnterEvent = new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
			});
			const firstStopPropagationSpy = vi.spyOn(
				firstEnterEvent,
				'stopPropagation'
			);
			fireEvent(select, firstEnterEvent);
			expect(firstStopPropagationSpy).toHaveBeenCalled();

			// Second Enter
			const secondEnterEvent = new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
			});
			vi.spyOn(secondEnterEvent, 'stopPropagation');
			fireEvent(select, secondEnterEvent);

			// Third Enter
			const thirdEnterEvent = new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
			});
			const thirdStopPropagationSpy = vi.spyOn(
				thirdEnterEvent,
				'stopPropagation'
			);
			fireEvent(select, thirdEnterEvent);

			// Should not stop propagation on third Enter
			expect(thirdStopPropagationSpy).not.toHaveBeenCalled();
		});

		it('resets enter count on focus', () => {
			render(<DropdownCell {...defaultProps} />);

			const select = screen.getByRole('combobox');

			// Setup for enter key test
			Object.defineProperty(document, 'activeElement', {
				writable: true,
				value: select,
			});
			mockInputRefs.current[
				`${defaultProps.rowIndex}-${defaultProps.colIndex}`
			] = select;

			// Press Enter once to increment counter
			fireEvent.keyDown(select, { key: 'Enter' });

			// Focus event should reset the counter
			fireEvent.focus(select);

			// Next Enter should be treated as first Enter again
			const enterEvent = new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
			});
			const stopPropagationSpy = vi.spyOn(enterEvent, 'stopPropagation');
			fireEvent(select, enterEvent);

			expect(stopPropagationSpy).toHaveBeenCalled();
		});

		it('does not handle Enter key when select is not focused', () => {
			render(<DropdownCell {...defaultProps} />);

			const select = screen.getByRole('combobox');

			// Make sure select is not the active element
			Object.defineProperty(document, 'activeElement', {
				writable: true,
				value: document.body, // Some other element
			});

			mockInputRefs.current[
				`${defaultProps.rowIndex}-${defaultProps.colIndex}`
			] = select;

			const enterEvent = new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
			});
			const stopPropagationSpy = vi.spyOn(enterEvent, 'stopPropagation');

			fireEvent(select, enterEvent);

			expect(stopPropagationSpy).not.toHaveBeenCalled();
		});
	});
});

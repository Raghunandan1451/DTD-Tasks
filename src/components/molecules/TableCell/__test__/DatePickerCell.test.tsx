import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import '@testing-library/jest-dom';
import DatePickerCell from '../DatePickerCell';
import { useTableContext } from '../../../../hooks/useTableContext';

// Mock the hooks
vi.mock('../../../../hooks/useTableContext');

const mockHandleCellDataChange = vi.fn();
const mockSetActiveCell = vi.fn();
const mockShowNotification = vi.fn();
const mockInputRefs = { current: {} };

describe('DatePickerCell Component', () => {
	// Mock functions

	beforeEach(() => {
		vi.clearAllMocks();
		(useTableContext as Mock).mockReturnValue({
			handleCellDataChange: mockHandleCellDataChange,
			setActiveCell: mockSetActiveCell,
			showNotification: mockShowNotification,
			inputRefs: mockInputRefs,
		});
	});

	const defaultProps = {
		column: { key: 'dueDate' },
		row: { uid: '1', dueDate: '' },
		rowIndex: 0,
		colIndex: 0,
	};

	// Helper to mock dates
	const mockDates = (mockedDate = '2025-04-03') => {
		const today = new Date(mockedDate);
		const oneMonthLater = new Date(today);
		oneMonthLater.setMonth(today.getMonth() + 1);

		vi.useFakeTimers();
		vi.setSystemTime(today);

		return { today, oneMonthLater, cleanup: () => vi.useRealTimers() };
	};

	it('renders date input field correctly', () => {
		render(<DatePickerCell {...defaultProps} />);

		// Find input by its type since we're directly using Input component
		const dateInput = document.querySelector('input[type="date"]');
		expect(dateInput).toBeInTheDocument();
	});

	it('sets min and max dates correctly', () => {
		const { cleanup } = mockDates(); // Set the date to 2025-04-03
		const { container } = render(<DatePickerCell {...defaultProps} />);

		// Make sure to query within the rendered container
		const dateInput = container.querySelector('input[type="date"]');

		// Check if the input exists before asserting attributes
		expect(dateInput).toBeInTheDocument();

		const expectedMin = new Date('2025-04-03').toLocaleDateString('en-CA');
		const expectedMax = new Date('2025-05-03').toLocaleDateString('en-CA');

		expect(dateInput).toHaveAttribute('min', expectedMin);
		expect(dateInput).toHaveAttribute('max', expectedMax);

		cleanup();
	});

	it('handles date changes correctly with valid date', () => {
		const { container } = render(<DatePickerCell {...defaultProps} />);

		const dateInput = container.querySelector('input[type="date"]');
		expect(dateInput).toBeInTheDocument();

		if (dateInput) {
			fireEvent.change(dateInput, { target: { value: '2025-04-15' } });
			expect(mockHandleCellDataChange).toHaveBeenCalledWith(
				'1',
				'dueDate',
				'2025-04-15'
			);
		}
	});

	it('sets active cell on focus', () => {
		const { container } = render(<DatePickerCell {...defaultProps} />);

		const dateInput = container.querySelector('input[type="date"]');
		expect(dateInput).toBeInTheDocument();

		if (dateInput) {
			fireEvent.focus(dateInput);
			expect(mockSetActiveCell).toHaveBeenCalledWith({ row: 0, col: 0 });
		}
	});

	it('validates date on Enter key press - valid date', () => {
		const { cleanup } = mockDates();

		const { container } = render(<TestWrapper />);

		const dateInput = container.querySelector('input[type="date"]');
		expect(dateInput).toBeInTheDocument();

		if (dateInput) {
			fireEvent.change(dateInput, { target: { value: '2025-04-15' } });
			fireEvent.keyDown(dateInput, { key: 'Enter' });

			expect(mockShowNotification).not.toHaveBeenCalled();
			expect(mockSetActiveCell).toHaveBeenCalledWith({ row: 0, col: 0 });
		}

		cleanup();
	});

	it('validates date on Enter key press - invalid date', () => {
		const { container } = render(<DatePickerCell {...defaultProps} />);

		const dateInput = container.querySelector('input[type="date"]');
		expect(dateInput).toBeInTheDocument();

		if (dateInput) {
			// We need to properly simulate an invalid date
			// This is tricky with HTML5 date inputs which validate automatically
			// Instead we'll directly trigger the keyDown without setting a valid value
			fireEvent.keyDown(dateInput, { key: 'Enter' });

			// Since the input is empty, it should be considered invalid
			expect(mockShowNotification).toHaveBeenCalledWith(
				'Please enter a valid date',
				'error'
			);
		}
	});

	it('validates date on Enter key press - date before today', () => {
		const { cleanup } = mockDates(); // Set the date to 2025-04-03

		const { container } = render(<TestWrapper />);

		const dateInput = container.querySelector('input[type="date"]');
		expect(dateInput).toBeInTheDocument();

		if (dateInput) {
			// Set a date before today (2025-04-02)
			fireEvent.change(dateInput, { target: { value: '2025-04-02' } });
			fireEvent.keyDown(dateInput, { key: 'Enter' });

			expect(mockShowNotification).toHaveBeenCalledWith(
				'Date cannot be earlier than today OR later than one month from today.',
				'error'
			);
		}

		cleanup();
	});

	it('displays initial value from row data', () => {
		const propsWithValue = {
			...defaultProps,
			row: { uid: '1', dueDate: '2025-04-20' },
		};

		const { container } = render(<DatePickerCell {...propsWithValue} />);

		const dateInput = container.querySelector('input[type="date"]');
		expect(dateInput).toBeInTheDocument();

		if (dateInput) {
			expect(dateInput).toHaveValue('2025-04-20');
		}
	});

	it('sets input ref correctly', () => {
		const { container } = render(<DatePickerCell {...defaultProps} />);

		const dateInput = container.querySelector('input[type="date"]');
		expect(dateInput).toBeInTheDocument();

		if (dateInput) {
			expect(mockInputRefs.current['0-0']).toBe(dateInput);
		}
	});
});

const TestWrapper = () => {
	const [dueDate, setDueDate] = useState('');

	const handleCellDataChange = (_uid: string, key: string, value: string) => {
		if (key === 'dueDate') {
			setDueDate(value);
		}
	};

	(useTableContext as Mock).mockReturnValue({
		handleCellDataChange,
		setActiveCell: mockSetActiveCell,
		showNotification: mockShowNotification,
		inputRefs: mockInputRefs,
	});

	const testRow = { uid: '1', dueDate };

	const props = {
		column: { key: 'dueDate' },
		row: testRow,
		rowIndex: 0,
		colIndex: 0,
	};

	return <DatePickerCell {...props} />;
};

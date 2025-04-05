import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NumericInputCell from '../NumericInputCell';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseInputProps } from '../../../atoms/Input/Input';

// Mock Input component
vi.mock('../../../atoms/Input/Input', () => ({
	default: (props: BaseInputProps) => (
		<input
			data-testid="numeric-input"
			value={props.value}
			onChange={props.onChange}
			onFocus={props.onFocus}
			ref={props.inputRef}
			type={props.type}
			id={props.id}
		/>
	),
}));

// Mock useTableContext
const handleCellDataChange = vi.fn();
const setActiveCell = vi.fn();
const showNotification = vi.fn();
const inputRefs = { current: {} };

vi.mock('@src/hooks/useTableContext', () => ({
	useTableContext: () => ({
		handleCellDataChange,
		setActiveCell,
		inputRefs,
		showNotification,
	}),
}));

describe('NumericInputCell', () => {
	const baseProps = {
		column: { key: 'quantity' },
		row: { uid: 'row1', quantity: '10' },
		rowIndex: 0,
		colIndex: 1,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the input with correct value and type', () => {
		render(<NumericInputCell {...baseProps} />);
		const input = screen.getByTestId('numeric-input');
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute('type', 'number');
		expect(input).toHaveValue(10);
	});

	it('calls handleCellDataChange with valid number', () => {
		render(<NumericInputCell {...baseProps} />);
		const input = screen.getByTestId('numeric-input');

		fireEvent.change(input, { target: { value: '5' } });

		expect(handleCellDataChange).toHaveBeenCalledWith(
			'row1',
			'quantity',
			'5'
		);
		expect(showNotification).not.toHaveBeenCalled();
	});

	it('shows error notification for 0 or negative values', () => {
		render(<NumericInputCell {...baseProps} />);
		const input = screen.getByTestId('numeric-input');

		fireEvent.change(input, { target: { value: '0' } });

		expect(showNotification).toHaveBeenCalledWith(
			'Negative numbers and zero are not allowed',
			'error'
		);
		expect(handleCellDataChange).not.toHaveBeenCalled();
	});

	it('calls setActiveCell on focus', () => {
		render(<NumericInputCell {...baseProps} />);
		const input = screen.getByTestId('numeric-input');

		fireEvent.focus(input);

		expect(setActiveCell).toHaveBeenCalledWith({ row: 0, col: 1 });
	});

	it('sets ref correctly in inputRefs', () => {
		render(<NumericInputCell {...baseProps} />);
		const input = screen.getByTestId('numeric-input');

		expect(inputRefs.current['0-1']).toBe(input);
	});
});

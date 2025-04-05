import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TextInputCell from '../TextInputCell';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseInputProps } from '../../../atoms/Input/Input';

// Mock Input component
vi.mock('../../../atoms/Input/Input', () => ({
	default: (props: BaseInputProps) => (
		<input
			data-testid="text-input"
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
const inputRefs = { current: {} };

vi.mock('@src/hooks/useTableContext', () => ({
	useTableContext: () => ({
		handleCellDataChange,
		setActiveCell,
		inputRefs,
	}),
}));

describe('TextInputCell', () => {
	const baseProps = {
		column: { key: 'name' },
		row: { uid: 'row1', name: 'Alice' },
		rowIndex: 0,
		colIndex: 1,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the input with correct value and type', () => {
		render(<TextInputCell {...baseProps} />);
		const input = screen.getByTestId('text-input');
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute('type', 'text');
		expect(input).toHaveValue('Alice');
	});

	it('calls handleCellDataChange on change', () => {
		render(<TextInputCell {...baseProps} />);
		const input = screen.getByTestId('text-input');

		fireEvent.change(input, { target: { value: 'Bob' } });

		expect(handleCellDataChange).toHaveBeenCalledWith(
			'row1',
			'name',
			'Bob'
		);
	});

	it('calls setActiveCell on focus', () => {
		render(<TextInputCell {...baseProps} />);
		const input = screen.getByTestId('text-input');

		fireEvent.focus(input);

		expect(setActiveCell).toHaveBeenCalledWith({ row: 0, col: 1 });
	});

	it('sets ref correctly in inputRefs', () => {
		render(<TextInputCell {...baseProps} />);
		const input = screen.getByTestId('text-input');

		expect(inputRefs.current['0-1']).toBe(input);
	});
});

import React from 'react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CellSelector from '../CellSelector';
import { useTableContext } from '../../../../hooks/useTableContext';

import DatePickerCell from '../DatePickerCell';

vi.mock('../../../../hooks/useTableContext', () => ({
	useTableContext: vi.fn(),
}));

vi.mock('../DatePickerCell', () => {
	return {
		__esModule: true,
		default: vi.fn(() => <div data-testid="mocked-date-picker" />),
	};
});

describe('CellSelector', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useTableContext as Mock).mockReturnValue({
			handleCellDataChange: vi.fn(),
			setActiveCell: vi.fn(),
			showNotification: vi.fn(),
			inputRefs: { current: {} },
		});
	});

	const defaultProps = {
		column: { key: 'name' },
		row: { uid: '1', name: '' },
		rowIndex: 0,
		colIndex: 0,
	};

	it('renders TextInputCell when columnType is text', () => {
		render(<CellSelector columnType="text" {...defaultProps} />);
		expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
	});

	it('renders DatePickerCell when columnType is date', () => {
		render(<CellSelector columnType="date" {...defaultProps} />);
		expect(DatePickerCell).toHaveBeenCalled();
	});

	it('renders DropdownCell when columnType is dropdown', () => {
		render(<CellSelector columnType="dropdown" {...defaultProps} />);
		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});

	it('renders NumericInputCell when columnType is number', () => {
		render(<CellSelector columnType="number" {...defaultProps} />);
		expect(screen.getByRole('spinbutton')).toHaveAttribute(
			'type',
			'number'
		);
	});

	it('renders an empty span for unknown columnType', () => {
		const { container } = render(<CellSelector columnType="unknown" />);
		expect(container.querySelector('span')).toBeInTheDocument();
	});
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import TableRow from './TableRow';
import { vi, describe, it, beforeEach, expect, Mock } from 'vitest';
import { useTableContext } from '../../../hooks/useTableContext';
import CellSelector from '../../molecules/TableCell/CellSelector';
import '@testing-library/jest-dom';

vi.mock('../../../hooks/useTableContext');
vi.mock('@src/components/molecules/TableCell/CellSelector', () => ({
	__esModule: true,
	default: vi.fn(() => <div data-testid="cell-selector" />),
}));

const mockColumns = [
	{ key: 'name', header: 'Name', className: 'w-1/3', type: 'text' },
	{ key: 'email', header: 'Email', className: 'w-1/3', type: 'text' },
	{ key: 'status', header: 'Status', className: 'w-1/3', type: 'dropdown' },
];

describe('TableRow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders serial number and cell selectors for data row', () => {
		const row = {
			uid: '1',
			name: 'John',
			email: 'john@mail.com',
			status: 'active',
		};
		const rowIndex = 2;

		(useTableContext as Mock).mockReturnValue({
			activeCell: { row: -1, col: -1 },
		});

		render(
			<TableRow row={row} rowIndex={rowIndex} columns={mockColumns} />
		);

		expect(screen.getByText('3')).toBeInTheDocument(); // S. No. = rowIndex + 1
		expect(screen.getAllByTestId('cell-selector')).toHaveLength(
			mockColumns.length
		);
	});

	it('adds active class to correct cell', () => {
		const row = {
			uid: '1',
			name: 'Jane',
			email: 'jane@mail.com',
			status: 'pending',
		};

		(useTableContext as Mock).mockReturnValue({
			activeCell: { row: 0, col: 1 }, // email column
		});

		const { container } = render(
			<TableRow row={row} rowIndex={0} columns={mockColumns} />
		);
		const tdElements = container.querySelectorAll('td');

		expect(tdElements[2]).toHaveClass('bg-zinc-700'); // 2nd index = email
	});

	it('renders empty cells if row is not a data row', () => {
		const emptyRow = {};
		(useTableContext as Mock).mockReturnValue({
			activeCell: { row: 0, col: 0 },
		});

		render(<TableRow row={emptyRow} rowIndex={0} columns={mockColumns} />);

		// S. No. + 3 empty <td>s
		expect(screen.getAllByRole('cell')).toHaveLength(
			1 + mockColumns.length
		);

		// CellSelector should not be called
		expect(CellSelector).not.toHaveBeenCalled();
	});
});

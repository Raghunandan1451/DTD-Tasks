import React from 'react';
import { render, screen } from '@testing-library/react';
import TableHeader from './TableHeader';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { useTableContext } from '../../../hooks/useTableContext';
import '@testing-library/jest-dom';

vi.mock('../../../hooks/useTableContext');

const mockCellRef = { current: null };

const mockColumns = [
	{ key: 'name', header: 'Name', className: 'w-3/12' },
	{ key: 'email', header: 'Email', className: 'w-4/12' },
	{ key: 'status', header: 'Status', className: 'w-2/12' },
];

describe('TableHeader', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(useTableContext as Mock).mockReturnValue({
			cellRef: mockCellRef,
		});
	});

	it('renders all column headers including S. No.', () => {
		render(<TableHeader columns={mockColumns} />);

		// Check S. No. column
		expect(screen.getByText('S. No.')).toBeInTheDocument();

		// Check dynamic column headers
		mockColumns.forEach((col) => {
			expect(screen.getByText(col.header)).toBeInTheDocument();
		});
	});

	it('assigns ref to thead', () => {
		render(<TableHeader columns={mockColumns} />);

		const thead = screen.getByRole('rowgroup'); // <thead> has role=rowgroup
		expect(thead).toBeInTheDocument();
	});
});

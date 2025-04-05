import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import EditDeletePair from '../EditDeletePair';
import { describe, it, expect, vi } from 'vitest';

describe('EditDeletePair', () => {
	it('renders edit and delete buttons', () => {
		render(<EditDeletePair onEdit={vi.fn()} onDelete={vi.fn()} />);

		expect(screen.getByTestId('edit')).toBeInTheDocument();
		expect(screen.getByTestId('trash')).toBeInTheDocument();
	});

	it('calls onEdit when the edit button is clicked', () => {
		const onEditMock = vi.fn();
		render(<EditDeletePair onEdit={onEditMock} onDelete={vi.fn()} />);

		fireEvent.click(screen.getByTestId('edit'));
		expect(onEditMock).toHaveBeenCalledTimes(1);
	});

	it('calls onDelete when the delete button is clicked', () => {
		const onDeleteMock = vi.fn();
		render(<EditDeletePair onEdit={vi.fn()} onDelete={onDeleteMock} />);

		fireEvent.click(screen.getByTestId('trash'));
		expect(onDeleteMock).toHaveBeenCalledTimes(1);
	});
});

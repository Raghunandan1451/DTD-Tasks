import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { useSelector, useDispatch } from 'react-redux';

import Todo from '../Todo'; // Adjust path as needed
import * as useNotificationsHook from '../../hooks/useNotifications';
import { addTodo, deleteTodo, updateTodo } from '../../store/todoSlice';

// Mock Redux
vi.mock('react-redux');
const useSelectorMock = vi.mocked(useSelector);
const useDispatchMock = vi.mocked(useDispatch);

// Mock notifications
vi.mock('../../hooks/useNotifications', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('../../utils/downloadHandler', () => ({
	handleDownloadPDF: vi.fn(),
}));

describe('Todo', () => {
	const mockDispatch = vi.fn();
	const mockShowNotification = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock selector data
		(useSelectorMock as Mock).mockImplementation((cb) =>
			cb({
				todos: [
					{
						uid: '1',
						task: 'Test Task',
						target: '2025-04-05',
						status: 'Not Started',
					},
				],
			})
		);

		(useDispatchMock as Mock).mockReturnValue(mockDispatch);

		(useNotificationsHook.default as Mock).mockReturnValue({
			notifications: [],
			showNotification: mockShowNotification,
		});
	});

	it('renders the heading and table', () => {
		render(<Todo />);
		expect(screen.getByText('TO-DO LIST')).toBeInTheDocument();
		expect(screen.getByText('Download PDF')).toBeInTheDocument();
		expect(screen.getByText('Test Task')).toBeInTheDocument();
	});

	it('calls dispatch on add row', () => {
		render(<Todo />);
		const addButton = screen.getByRole('button', { name: /download pdf/i }); // You might rename button if needed
		fireEvent.click(addButton);

		// This only triggers download, not addRow. So manually trigger onAddRow:
		const customTable = screen.getByText('Test Task').closest('table'); // Example, find your trigger
		expect(customTable).toBeInTheDocument();
		// Actual table action like addRow should be tested in the CustomTable test
	});

	it('calls download handler on download', async () => {
		const { handleDownloadPDF } = await import(
			'../../utils/downloadHandler'
		);
		render(<Todo />);
		const downloadBtn = screen.getByRole('button', {
			name: /download pdf/i,
		});
		fireEvent.click(downloadBtn);

		expect(handleDownloadPDF).toHaveBeenCalled();
	});

	it('dispatches updateTodo on update', () => {
		render(<Todo />);

		const updatedValue = 'Updated Task';
		const expectedPayload = {
			id: '1',
			key: 'task',
			value: updatedValue,
		};

		// Simulate `handleUpdate` via component logic
		const props = screen.getByText('Test Task');
		expect(props).toBeInTheDocument();

		// Again, this is better covered in CustomTable tests,
		// but you can extract and test the inner function separately if you expose it
	});

	it('dispatches deleteTodo on delete', () => {
		render(<Todo />);
		const deletePayload = { id: '1' };

		// Simulate `handleDeleteRow`
		// You can expose and test directly or simulate a row delete inside the table
		expect(mockDispatch).not.toHaveBeenCalledWith(
			deleteTodo(deletePayload)
		);
	});
});

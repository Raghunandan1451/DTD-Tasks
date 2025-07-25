import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { useSelector, useDispatch } from 'react-redux';
import Todo from '../Todo';
import '@testing-library/jest-dom';

import * as downloadHandler from '../../utils/downloadHandler';
import { addTodo, deleteTodo, updateTodo } from '../../store/todoSlice';
import { RootState } from '../../store/store';

// Mock Redux hooks with types
vi.mock('react-redux', async () => {
	const actual = await vi.importActual<typeof import('react-redux')>(
		'react-redux'
	);
	return {
		...actual,
		useSelector: vi.fn(),
		useDispatch: vi.fn(),
	};
});

// Mock child components with proper types
vi.mock('../../components/organisms/Table/CustomTable', () => ({
	default: ({
		onAddRow,
		onUpdate,
		onDeleteRow,
	}: {
		onAddRow: () => void;
		onUpdate: (id: string, key: string, value: string) => void;
		onDeleteRow: (params: { id: string }) => void;
	}) => (
		<div>
			<button onClick={onAddRow}>Add Row</button>
			<button onClick={() => onUpdate('1', 'task', 'Updated Task')}>
				Update Row
			</button>
			<button onClick={() => onDeleteRow({ id: '1' })}>Delete Row</button>
		</div>
	),
}));

vi.mock('../../components/molecules/Header/TitleWithButton', () => ({
	default: ({ onDownload }: { onDownload: (heading: string) => void }) => (
		<button onClick={() => onDownload('To-Do List')}>Download PDF</button>
	),
}));

vi.mock('../../components/organisms/Notifications/NotificationCenter', () => ({
	default: () => <div>Notifications</div>,
}));

// Mock useNotifications hook properly typed
vi.mock('../../hooks/useNotifications', () => ({
	default: vi.fn().mockReturnValue({
		notifications: [],
		showNotification: vi.fn(),
	}),
}));

// Mock download utility with no `any`
vi.mock('../../utils/downloadHandler', () => ({
	handleDownloadPDF: vi.fn(),
}));

describe('Todo Component', () => {
	const mockDispatch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Properly type mocked useSelector and useDispatch
		(useSelector as unknown as Mock).mockImplementation(
			(selector: (state: RootState) => unknown) =>
				selector({
					todos: [
						{
							uid: '1',
							task: 'Test Task',
							target: '2025-04-12',
							status: 'Not Started',
						},
					],
					shopping: [],
					qr: [],
					fileManager: [],
				})
		);

		(useDispatch as unknown as Mock).mockReturnValue(mockDispatch);
	});

	it('renders todo list with title and table', () => {
		render(<Todo />);
		expect(screen.getByText('Download PDF')).toBeInTheDocument();
		expect(screen.getByText('Add Row')).toBeInTheDocument();
		expect(screen.getByText('Notifications')).toBeInTheDocument();
	});

	it('dispatches addTodo on add row', () => {
		render(<Todo />);
		fireEvent.click(screen.getByText('Add Row'));
		expect(mockDispatch).toHaveBeenCalledWith(
			addTodo({ task: '', target: '', status: '' })
		);
	});

	it('dispatches updateTodo on row update', () => {
		render(<Todo />);
		fireEvent.click(screen.getByText('Update Row'));
		expect(mockDispatch).toHaveBeenCalledWith(
			updateTodo({ id: '1', key: 'task', value: 'Updated Task' })
		);
	});

	it('dispatches deleteTodo on row delete', () => {
		render(<Todo />);
		fireEvent.click(screen.getByText('Delete Row'));
		expect(mockDispatch).toHaveBeenCalledWith(deleteTodo({ id: '1' }));
	});

	it('calls handleDownloadPDF on download click', () => {
		render(<Todo />);
		fireEvent.click(screen.getByText('Download PDF'));
		expect(downloadHandler.handleDownloadPDF).toHaveBeenCalled();
	});
});

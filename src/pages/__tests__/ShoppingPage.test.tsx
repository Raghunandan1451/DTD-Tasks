import React from 'react';
import '@testing-library/jest-dom';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import { useSelector, useDispatch } from 'react-redux';
import Shopping from '../Shopping';

import * as downloadHandler from '../../utils/downloadHandler';
import { addItem, deleteItem, updateItem } from '../../store/shoppingSlice';
import { RootState } from '../../store/store';

// 🧪 Mock Redux
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

// 🧪 Mock CustomTable
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
			<button
				onClick={() => onUpdate('1', 'productName', 'Updated Product')}>
				Update Row
			</button>
			<button onClick={() => onDeleteRow({ id: '1' })}>Delete Row</button>
		</div>
	),
}));

// 🧪 Mock TitleWithButton
vi.mock('../../components/molecules/Header/TitleWithButton', () => ({
	default: ({ onDownload }: { onDownload: (heading: string) => void }) => (
		<button onClick={() => onDownload('Shopping List')}>
			Download PDF
		</button>
	),
}));

// 🧪 Mock NotificationCenter
vi.mock('../../components/organisms/Notifications/NotificationCenter', () => ({
	default: () => <div>Notifications</div>,
}));

// 🧪 Mock useNotifications
vi.mock('../../hooks/useNotifications', () => ({
	default: vi.fn(() => ({
		notifications: [],
		showNotification: vi.fn(),
	})),
}));

// 🧪 Mock download handler
vi.mock('../../utils/downloadHandler', () => ({
	handleDownloadPDF: vi.fn(),
}));

describe('Shopping Component', () => {
	const mockDispatch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// 🔧 Correctly type useSelector + useDispatch
		(useSelector as unknown as Mock).mockImplementation(
			(selector: (state: RootState) => unknown) =>
				selector({
					todos: [],
					shopping: [
						{
							uid: '1',
							productName: 'Milk',
							quantity: '2',
							unit: 'L',
						},
					],
					qr: [],
					fileManager: [],
				})
		);

		(useDispatch as unknown as Mock).mockReturnValue(mockDispatch);
	});

	it('renders shopping list UI', () => {
		render(<Shopping />);
		expect(screen.getByText('Download PDF')).toBeInTheDocument();
		expect(screen.getByText('Add Row')).toBeInTheDocument();
		expect(screen.getByText('Notifications')).toBeInTheDocument();
	});

	it('dispatches addItem when Add Row is clicked', () => {
		render(<Shopping />);
		fireEvent.click(screen.getByText('Add Row'));
		expect(mockDispatch).toHaveBeenCalledWith(
			addItem({ productName: '', quantity: '', unit: '' })
		);
	});

	it('dispatches updateItem when Update Row is clicked', () => {
		render(<Shopping />);
		fireEvent.click(screen.getByText('Update Row'));
		expect(mockDispatch).toHaveBeenCalledWith(
			updateItem({
				id: '1',
				key: 'productName',
				value: 'Updated Product',
			})
		);
	});

	it('dispatches deleteItem when Delete Row is clicked', () => {
		render(<Shopping />);
		fireEvent.click(screen.getByText('Delete Row'));
		expect(mockDispatch).toHaveBeenCalledWith(deleteItem({ id: '1' }));
	});

	it('calls handleDownloadPDF on download', () => {
		render(<Shopping />);
		fireEvent.click(screen.getByText('Download PDF'));
		expect(downloadHandler.handleDownloadPDF).toHaveBeenCalled();
	});
});

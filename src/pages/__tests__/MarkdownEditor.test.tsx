import React from 'react';
import '@testing-library/jest-dom';

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect, Mock } from 'vitest';
import MarkdownEditor from '../MarkdownEditor';
import { useSelector } from 'react-redux';
import * as downloadHandler from '../../utils/downloadHandler';
import { RootState } from '../../store/store';

// 🧪 Mocks
vi.mock('react-redux', async () => {
	const actual = await vi.importActual<typeof import('react-redux')>(
		'react-redux'
	);
	return {
		...actual,
		useSelector: vi.fn(),
	};
});

const mockShowNotification = vi.fn();

vi.mock('../../hooks/useNotifications', async () => {
	const actual = await vi.importActual<
		typeof import('../../hooks/useNotifications')
	>('../../hooks/useNotifications');
	return {
		...actual,
		default: vi.fn(() => ({
			notifications: [],
			showNotification: mockShowNotification,
		})),
	};
});

vi.mock('../../utils/downloadHandler', () => ({
	handleZIPExport: vi.fn(),
}));

vi.mock('../../components/organisms/Notifications/NotificationCenter', () => ({
	default: () => <div>Notification Center</div>,
}));

vi.mock('../../components/organisms/Markdown/FileTree', () => ({
	default: () => <div>File Tree</div>,
}));

vi.mock('../../components/organisms/Markdown/Editor', () => ({
	default: () => <div>Editor</div>,
}));

vi.mock('../../components/molecules/Header/TitleWithButton', () => ({
	default: ({ onDownload }: { onDownload: () => void }) => (
		<button onClick={onDownload}>Export as ZIP</button>
	),
}));

describe('MarkdownEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(useSelector as unknown as Mock).mockImplementation(
			(selector: (state: RootState) => unknown) =>
				selector({
					fileManager: {
						files: [
							{ name: 'README.md', content: '# Hello' },
							{ name: 'index.md', content: 'Welcome' },
						],
					},
					todos: [],
					shopping: [],
					qr: {},
				})
		);
	});

	it('renders all parts of the UI', () => {
		render(<MarkdownEditor />);
		expect(screen.getByText('Export as ZIP')).toBeInTheDocument();
		expect(screen.getByText('File Tree')).toBeInTheDocument();
		expect(screen.getByText('Editor')).toBeInTheDocument();
		expect(screen.getByText('Notification Center')).toBeInTheDocument();
	});

	it('calls handleZIPExport on download button click', () => {
		render(<MarkdownEditor />);
		fireEvent.click(screen.getByText('Export as ZIP'));
		expect(downloadHandler.handleZIPExport).toHaveBeenCalledWith(
			[
				{ name: 'README.md', content: '# Hello' },
				{ name: 'index.md', content: 'Welcome' },
			],
			mockShowNotification
		);
	});
});

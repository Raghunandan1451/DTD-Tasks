import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileTree from '../FileTree';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock TreeView to inspect props
vi.mock('@src/components/organisms/Markdown/TreeView', () => ({
	__esModule: true,
	default: ({ showInput }: { showInput: boolean }) => (
		<div data-testid="treeview">
			{showInput ? 'Input Visible' : 'Tree View'}
		</div>
	),
}));

describe('FileTree', () => {
	it('renders the Add File button', () => {
		render(<FileTree />);
		const button = screen.getByRole('button', { name: /add file/i });
		expect(button).toBeInTheDocument();
	});

	it('shows input in TreeView when Add File is clicked', () => {
		render(<FileTree />);
		const button = screen.getByRole('button', { name: /add file/i });

		fireEvent.click(button);

		const treeView = screen.getByTestId('treeview');
		expect(treeView).toHaveTextContent('Input Visible');
	});
});

import React from 'react';
import '@testing-library/jest-dom';

import { render, screen, fireEvent } from '@testing-library/react';
import CreateFileFolder from '../CreateFileFolder';
import { describe, it, expect, vi } from 'vitest';

describe('CreateFileFolder Component', () => {
	it('renders the input field with the correct placeholder', () => {
		render(
			<CreateFileFolder
				setShowInput={() => {}}
				newFilePath=""
				setNewFilePath={() => {}}
				onCreate={() => {}}
			/>
		);
		const input = screen.getByPlaceholderText('Enter folder/file name');
		expect(input).toBeInTheDocument();
	});

	it('updates input value when typed', () => {
		const setNewFilePathMock = vi.fn();
		render(
			<CreateFileFolder
				setShowInput={() => {}}
				newFilePath=""
				setNewFilePath={setNewFilePathMock}
				onCreate={() => {}}
			/>
		);
		const input = screen.getByPlaceholderText('Enter folder/file name');
		fireEvent.change(input, { target: { value: 'NewFile.md' } });

		expect(setNewFilePathMock).toHaveBeenCalledWith('NewFile.md');
	});

	it('calls onCreate when the create button is clicked', () => {
		const onCreateMock = vi.fn();
		render(
			<CreateFileFolder
				setShowInput={() => {}}
				newFilePath="Test.md"
				setNewFilePath={() => {}}
				onCreate={onCreateMock}
			/>
		);
		const button = screen.getByRole('button', { name: /create/i });
		fireEvent.click(button);

		expect(onCreateMock).toHaveBeenCalledTimes(1);
	});

	it('calls onCreate when Enter is pressed in the input field', () => {
		const onCreateMock = vi.fn();
		render(
			<CreateFileFolder
				setShowInput={() => {}}
				newFilePath="Test.md"
				setNewFilePath={() => {}}
				onCreate={onCreateMock}
			/>
		);
		const input = screen.getByPlaceholderText('Enter folder/file name');
		fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

		expect(onCreateMock).toHaveBeenCalledTimes(1);
	});

	it('closes the modal when clicking outside the content box', () => {
		const setShowInputMock = vi.fn();
		render(
			<CreateFileFolder
				setShowInput={setShowInputMock}
				newFilePath=""
				setNewFilePath={() => {}}
				onCreate={() => {}}
			/>
		);
		const overlay = screen.getByTestId('modal-overlay');
		fireEvent.click(overlay);

		expect(setShowInputMock).toHaveBeenCalledWith(false);
	});
});

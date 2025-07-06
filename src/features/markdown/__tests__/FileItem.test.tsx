import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FileItem from '../FileItem';

describe('FileItem', () => {
	let mockOnSelect: ReturnType<typeof vi.fn>;
	let mockOnDelete: ReturnType<typeof vi.fn>;
	let mockOnRename: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnSelect = vi.fn();
		mockOnDelete = vi.fn();
		mockOnRename = vi.fn();

		render(
			<FileItem
				path="example.md"
				isSelected={false}
				onSelect={mockOnSelect}
				onDelete={mockOnDelete}
				onRename={mockOnRename}
			/>
		);
	});

	it('renders the file name correctly', () => {
		expect(screen.getByText('example.md')).toBeInTheDocument();
	});

	it('calls onSelect when clicked', () => {
		fireEvent.click(screen.getByText('example.md'));
		expect(mockOnSelect).toHaveBeenCalled();
	});

	it('calls onDelete when delete button is clicked', () => {
		const deleteButton = screen.getByTestId('trash');
		fireEvent.click(deleteButton);
		expect(mockOnDelete).toHaveBeenCalled();
	});

	it('calls onRename when edit button is clicked', () => {
		const editButton = screen.getByTestId('edit');
		fireEvent.click(editButton);
		expect(mockOnRename).toHaveBeenCalled();
	});

	it('applies selected class when isSelected is true', () => {
		render(
			<FileItem
				path="example1.md"
				isSelected={true}
				onSelect={mockOnSelect}
				onDelete={mockOnDelete}
				onRename={mockOnRename}
			/>
		);

		const fileItem = screen.getByText('example1.md').closest('div');
		expect(fileItem).toHaveClass('bg-gray-700');
	});
});

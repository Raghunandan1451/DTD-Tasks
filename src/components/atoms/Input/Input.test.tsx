import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Input from '@components/atoms/Input/Input';
import '@testing-library/jest-dom';

describe('Input Component', () => {
	const mockOnChange = vi.fn();
	const mockOnFocus = vi.fn();
	const mockOnKeyDown = vi.fn();
	const mockInputRef = vi.fn();

	// Reset mocks before each test
	beforeEach(() => {
		mockOnChange.mockClear();
		mockOnFocus.mockClear();
		mockOnKeyDown.mockClear();
		mockInputRef.mockClear();
	});

	it('renders correctly with required props', () => {
		render(
			<Input
				type="text"
				value="Test Value"
				onChange={mockOnChange}
				inputRef={mockInputRef}
			/>
		);

		const inputElement = screen.getByDisplayValue('Test Value');
		expect(inputElement).toBeInTheDocument();
		expect(inputElement).toHaveAttribute('type', 'text');
		expect(inputElement).toHaveClass(
			'w-full bg-transparent outline-hidden'
		);
	});

	it('handles undefined value correctly', () => {
		render(
			<Input
				type="text"
				value={undefined}
				onChange={mockOnChange}
				inputRef={mockInputRef}
			/>
		);

		const inputElement = screen.getByDisplayValue('');
		expect(inputElement).toBeInTheDocument();
	});

	it('applies custom className when provided', () => {
		render(
			<Input
				type="text"
				value="Test Value"
				onChange={mockOnChange}
				inputRef={mockInputRef}
				className="custom-class"
			/>
		);

		const inputElement = screen.getByDisplayValue('Test Value');
		expect(inputElement).toHaveClass('custom-class');
	});

	// it('calls onChange handler when value changes', async () => {
	// 	render(
	// 		<Input
	// 			type="text"
	// 			value="Test Value"
	// 			onChange={mockOnChange}
	// 			inputRef={mockInputRef}
	// 		/>
	// 	);

	// 	const inputElement = screen.getByDisplayValue('Test Value');

	// 	// Use a separate variable for the new value to verify it in our test
	// 	const newValue = 'New Value';
	// 	fireEvent.change(inputElement, { target: { value: newValue } });

	// 	// Check that mockOnChange was called
	// 	expect(mockOnChange).toHaveBeenCalledTimes(1);

	// 	// Check the value passed to the event handler
	// 	const event = mockOnChange.mock.calls[0][0];
	// 	expect(event.target.value).toBe(newValue);
	// });

	// it('calls onFocus handler when input is focused', () => {
	// 	render(
	// 		<Input
	// 			type="text"
	// 			value="Test Value"
	// 			onChange={mockOnChange}
	// 			onFocus={mockOnFocus}
	// 			inputRef={mockInputRef}
	// 		/>
	// 	);

	// 	const inputElement = screen.getByDisplayValue('Test Value');
	// 	fireEvent.focus(inputElement);

	// 	expect(mockOnFocus).toHaveBeenCalledTimes(1);
	// });

	it('calls onKeyDown handler when key is pressed', () => {
		render(
			<Input
				type="text"
				value="Test Value"
				onChange={mockOnChange}
				onKeyDown={mockOnKeyDown}
				inputRef={mockInputRef}
			/>
		);

		const inputElement = screen.getByDisplayValue('Test Value');
		fireEvent.keyDown(inputElement, { key: 'Enter', code: 'Enter' });

		expect(mockOnKeyDown).toHaveBeenCalledTimes(1);
		expect(mockOnKeyDown.mock.calls[0][0].key).toBe('Enter');
	});

	it('applies min and max attributes for number type', () => {
		render(
			<Input
				type="number"
				value={50}
				onChange={mockOnChange}
				inputRef={mockInputRef}
				min="0"
				max="100"
			/>
		);

		const inputElement = screen.getByDisplayValue('50');
		expect(inputElement).toHaveAttribute('min', '0');
		expect(inputElement).toHaveAttribute('max', '100');
	});

	it('applies min and max attributes for date type', () => {
		render(
			<Input
				type="date"
				value="2023-01-01"
				onChange={mockOnChange}
				inputRef={mockInputRef}
				min="2023-01-01"
				max="2023-12-31"
			/>
		);

		const inputElement = screen.getByDisplayValue('2023-01-01');
		expect(inputElement).toHaveAttribute('min', '2023-01-01');
		expect(inputElement).toHaveAttribute('max', '2023-12-31');
	});

	it('calls inputRef with the input element', () => {
		render(
			<Input
				type="text"
				value="Test Value"
				onChange={mockOnChange}
				inputRef={mockInputRef}
			/>
		);

		// The inputRef should have been called with the input element
		expect(mockInputRef).toHaveBeenCalledTimes(1);
		expect(mockInputRef.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement);
	});
});

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Input from './Input';
import '@testing-library/jest-dom';

describe('Input Component', () => {
	it('should render correctly', () => {
		render(<Input id="input-test" value="Hello" onChange={() => {}} />);
		const input = screen.getByRole('textbox');
		expect(input).toHaveValue('Hello');
	});

	it('should call onChange when value changes', () => {
		const handleChangeMock = vi.fn();
		render(
			<Input id="input-test" value="Hello" onChange={handleChangeMock} />
		);
		const input = screen.getByRole('textbox');

		fireEvent.change(input, { target: { value: 'World' } });
		expect(handleChangeMock).toHaveBeenCalledTimes(1);
	});

	it('should calls onFocus when focused', () => {
		const handleFocus = vi.fn();
		render(
			<Input
				id="test-input"
				value=""
				onChange={() => {}}
				onFocus={handleFocus}
			/>
		);
		const input = screen.getByRole('textbox');

		fireEvent.focus(input);

		expect(handleFocus).toHaveBeenCalled();
	});

	it('should calls onKeyDown when a key is pressed', () => {
		const handleKeyDown = vi.fn();
		render(
			<Input
				id="test-input"
				value=""
				onChange={() => {}}
				onKeyDown={handleKeyDown}
			/>
		);
		const input = screen.getByRole('textbox');

		fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

		expect(handleKeyDown).toHaveBeenCalledTimes(1);
	});

	it('should renders with the correct type attribute', () => {
		render(
			<Input
				id="password-input"
				type="password"
				value="secret"
				onChange={() => {}}
			/>
		);
		const input = screen.getByDisplayValue('secret');
		expect(input).toHaveAttribute('type', 'password');
	});

	it('should renders with the correct placeholder', () => {
		render(
			<Input
				id="test-input"
				placeholder="Enter text"
				value=""
				onChange={() => {}}
			/>
		);
		const input = screen.getByPlaceholderText('Enter text');
		expect(input).toBeInTheDocument();
	});

	it('should render with min and max attributes if provided', () => {
		render(
			<Input
				id="number-input"
				type="number"
				min="1"
				max="10"
				value=""
				onChange={() => {}}
			/>
		);
		const input = screen.getByRole('spinbutton');
		expect(input).toHaveAttribute('min', '1');
		expect(input).toHaveAttribute('max', '10');
	});

	it('should support ref forwarding', () => {
		const refMock = vi.fn();
		render(
			<Input
				id="test-input"
				value=""
				onChange={() => {}}
				inputRef={refMock}
			/>
		);

		expect(refMock).toHaveBeenCalled();
	});
});

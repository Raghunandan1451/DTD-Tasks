import { fireEvent, render, screen } from '@testing-library/react';
import Button from '@src/components/atoms/Button/Button';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

describe('Button component', () => {
	it('should render button with text Download', () => {
		render(<Button />);
		expect(screen.getByText('Download')).toBeInTheDocument();
	});

	it('should render button with text Submit', () => {
		render(<Button text="Submit" />);
		expect(screen.getByText('Submit')).toBeInTheDocument();
	});

	it('calls onClick prop when clicked', () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick} />);
		const button = screen.getByRole('button');
		fireEvent.click(button);
		expect(onClick).toHaveBeenCalled();
	});

	it('add className to button element', () => {
		render(<Button className="bg-red-500" />);
		const button = screen.getByRole('button');
		expect(button).toHaveClass('bg-red-500');
	});

	it('should be disabled', () => {
		render(<Button disabled />);
		const button = screen.getByRole('button');
		expect(button).toBeDisabled();
	});

	it('should have type submit', () => {
		render(<Button type="submit" />);
		const button = screen.getByRole('button');
		expect(button).toHaveAttribute('type', 'submit');
	});
});

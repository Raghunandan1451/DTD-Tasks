// ListSelector.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ListSelector from '../ListSelector'; // Adjust the path as needed
import '@testing-library/jest-dom';

describe('ListSelector component', () => {
	it('renders all list items', () => {
		render(
			<MemoryRouter>
				<ListSelector />
			</MemoryRouter>
		);

		// Expected list items
		const items = [
			'Home',
			'ToDo List',
			'Shopping List',
			'QR Code Generator',
			'Markdown Editor',
		];
		items.forEach((item) => {
			expect(screen.getByText(item)).toBeInTheDocument();
		});
	});

	it('applies active class to the correct link', () => {
		// Set initial route to "/todo" so that the ToDo List link is active.
		render(
			<MemoryRouter initialEntries={['/todo']}>
				<ListSelector />
			</MemoryRouter>
		);

		const todoLink = screen.getByText('ToDo List');

		// In your component, when active, the link gets "bg-teal-400" in its className.
		expect(todoLink).toHaveClass('bg-teal-400');

		// Check that a non-active link (e.g., "Home") does not have the active class.
		const homeLink = screen.getByText('Home');
		expect(homeLink).not.toHaveClass('bg-teal-400');
	});
});

// ListSelector.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ListSelector from '../ListSelector'; // Adjust the path as needed
import '@testing-library/jest-dom';
import { ThemeProvider } from '../../context/ThemeContext';

describe('ListSelector component', () => {
	beforeEach(() => {
        // Mock window.matchMedia to return the preferred theme for testing purposes
        global.matchMedia = vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)', // Set this to true or false depending on what theme you want to test
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));
      });
      
	it('renders all list items', () => {
		render(
			<MemoryRouter>
				<ThemeProvider>
					<ListSelector />
				</ThemeProvider>
			</MemoryRouter>
		);

		// Expected list items
		const items = [
			'Home',
			'To-Do',
			'Shopping',
			'QR Code',
			'Markdown',
		];
		items.forEach((item) => {
			expect(screen.getByText(item)).toBeInTheDocument();
		});
	});

	it('applies active class to the correct link', () => {
		// Set initial route to "/todo" so that the ToDo List link is active.
		render(
			<MemoryRouter initialEntries={['/todo']}>
				<ThemeProvider><ListSelector /></ThemeProvider>
			</MemoryRouter>
		);

		const todoLink = screen.getByText('To-Do');

		// In your component, when active, the link gets "bg-teal-400" in its className.
		expect(todoLink).toHaveClass('active');

		// Check that a non-active link (e.g., "Home") does not have the active class.
		const homeLink = screen.getByText('Home');
		expect(homeLink).not.toHaveClass('active');
	});
});

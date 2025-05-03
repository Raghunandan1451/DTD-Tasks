// Layout.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../Layout'; // Adjust the path as needed
import '@testing-library/jest-dom';
import { ThemeProvider } from '../../context/ThemeContext';

// A dummy component to render in the Outlet.
const DummyComponent = () => <div data-testid="dummy">Dummy</div>;

describe('Layout component', () => {
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
      
	it('renders ListSelector and Outlet', () => {
		render(
			<MemoryRouter initialEntries={['/']}>
				<ThemeProvider>
				<Routes>
					{/* Wrap Layout so that Outlet can render the dummy component */}
					<Route element={<Layout />}>
						<Route path="/" element={<DummyComponent />} />
					</Route>
				</Routes>
				</ThemeProvider>
			</MemoryRouter>
		);

		// Check that ListSelector is rendered by searching for one of its links (e.g., "Home")
		expect(screen.getByText('Home')).toBeInTheDocument();

		// Check that the Outlet is rendering the dummy component
		expect(screen.getByTestId('dummy')).toBeInTheDocument();
	});
});

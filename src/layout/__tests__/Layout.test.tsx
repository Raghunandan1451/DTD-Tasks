// Layout.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../Layout'; // Adjust the path as needed
import '@testing-library/jest-dom';

// A dummy component to render in the Outlet.
const DummyComponent = () => <div data-testid="dummy">Dummy</div>;

describe('Layout component', () => {
	it('renders ListSelector and Outlet', () => {
		render(
			<MemoryRouter initialEntries={['/']}>
				<Routes>
					{/* Wrap Layout so that Outlet can render the dummy component */}
					<Route element={<Layout />}>
						<Route path="/" element={<DummyComponent />} />
					</Route>
				</Routes>
			</MemoryRouter>
		);

		// Check that ListSelector is rendered by searching for one of its links (e.g., "Home")
		expect(screen.getByText('Home')).toBeInTheDocument();

		// Check that the Outlet is rendering the dummy component
		expect(screen.getByTestId('dummy')).toBeInTheDocument();
	});
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import NotificationCenter from './NotificationCenter';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';

describe('NotificationCenter', () => {
	it('renders an error notification with correct styling', () => {
		const notifications = [
			{ id: '1', message: 'Error occurred', type: 'error' },
		];
		render(<NotificationCenter notifications={notifications} />);
		const notificationElement = screen.getByText('Error occurred');
		expect(notificationElement).toBeInTheDocument();
		expect(notificationElement).toHaveClass('bg-red-100');
		expect(notificationElement).toHaveClass('text-red-800');
	});

	it('renders a success notification with correct styling', () => {
		const notifications = [
			{ id: '2', message: 'Operation successful', type: 'success' },
		];
		render(<NotificationCenter notifications={notifications} />);
		const notificationElement = screen.getByText('Operation successful');
		expect(notificationElement).toBeInTheDocument();
		expect(notificationElement).toHaveClass('bg-green-100');
		expect(notificationElement).toHaveClass('text-green-800');
	});

	it('renders an info notification with default styling', () => {
		const notifications = [
			{ id: '3', message: 'Information', type: 'info' },
		];
		render(<NotificationCenter notifications={notifications} />);
		const notificationElement = screen.getByText('Information');
		expect(notificationElement).toBeInTheDocument();
		expect(notificationElement).toHaveClass('bg-blue-100');
		expect(notificationElement).toHaveClass('text-blue-800');
	});

	it('renders multiple notifications', () => {
		const notifications = [
			{ id: '1', message: 'Error occurred', type: 'error' },
			{ id: '2', message: 'Operation successful', type: 'success' },
			{ id: '3', message: 'Information', type: 'info' },
		];
		render(<NotificationCenter notifications={notifications} />);
		notifications.forEach(({ message }) => {
			expect(screen.getByText(message)).toBeInTheDocument();
		});
	});
});

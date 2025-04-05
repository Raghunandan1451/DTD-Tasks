// useNotifications.test.ts

import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import useNotifications from '../useNotifications'; // adjust path
import { describe, it, expect, vi } from 'vitest';

describe('useNotifications', () => {
	it('should initialize with empty notifications', () => {
		const { result } = renderHook(() => useNotifications());

		expect(result.current.notifications).toEqual([]);
	});

	it('should add a notification', () => {
		const { result } = renderHook(() => useNotifications());

		act(() => {
			result.current.showNotification('Test message', 'success');
		});

		expect(result.current.notifications.length).toBe(1);
		expect(result.current.notifications[0]).toMatchObject({
			message: 'Test message',
			type: 'success',
		});
	});

	it('should remove notification after 5 seconds', () => {
		vi.useFakeTimers();
		const { result } = renderHook(() => useNotifications());

		act(() => {
			result.current.showNotification('Auto dismiss', 'info');
		});

		expect(result.current.notifications.length).toBe(1);

		// Fast forward time
		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(result.current.notifications.length).toBe(0);
		vi.useRealTimers();
	});
});

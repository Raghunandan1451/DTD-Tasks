import { RefObject, useCallback, useEffect, useMemo, useState } from "react";
import {
	generateRecurringInstances,
	getEventsForColumn,
} from "../src/features/event/lib/utils";
import { DateColumn, Event } from "../src/features/event/type";

// Hook: auto-scroll to current hour
export function useAutoScrollToHour(ref: RefObject<HTMLDivElement>) {
	useEffect(() => {
		if (ref.current) {
			const now = new Date();
			const currentHour = now.getHours();
			const scrollPosition = Math.max(0, (currentHour - 2) * 60);

			ref.current.scrollTo({
				top: scrollPosition,
				behavior: "smooth",
			});
		}
	}, [ref]);
}

// Hook: recurring events (wraps utility function with memo)
export function useRecurringEvents(events: Event[], dateColumns: DateColumn[]) {
	return useMemo(
		() => generateRecurringInstances(events, dateColumns),
		[events, dateColumns]
	);
}

// Hook: events for specific column with memoization
export function useColumnEvents(
	columnDate: string,
	events: Event[],
	dateColumns: DateColumn[]
) {
	return useMemo(
		() => getEventsForColumn(columnDate, events, dateColumns),
		[columnDate, events, dateColumns]
	);
}

// Hook: debounced value for search/filtering
export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

// Hook: filtered events with search and tag filtering
export function useFilteredEvents(
	events: Event[],
	searchTerm: string,
	selectedTags: string[],
	dateRange?: { start: string; end: string }
) {
	const debouncedSearchTerm = useDebounce(searchTerm, 300);

	return useMemo(() => {
		return events.filter((event) => {
			// Text search
			const matchesSearch =
				!debouncedSearchTerm ||
				event.title
					.toLowerCase()
					.includes(debouncedSearchTerm.toLowerCase()) ||
				event.content
					.toLowerCase()
					.includes(debouncedSearchTerm.toLowerCase());

			// Tag filter
			const matchesTag =
				selectedTags.length === 0 || selectedTags.includes(event.tag);

			// Date range filter
			const matchesDateRange =
				!dateRange ||
				(event.startDate >= dateRange.start &&
					event.startDate <= dateRange.end);

			return matchesSearch && matchesTag && matchesDateRange;
		});
	}, [events, debouncedSearchTerm, selectedTags, dateRange]);
}

// Hook: event conflict detection
export function useEventConflicts(
	newEvent: Partial<Event>,
	existingEvents: Event[],
	excludeEventId?: string | number
) {
	return useMemo(() => {
		if (
			!newEvent.startDate ||
			!newEvent.startTime ||
			!newEvent.endDate ||
			!newEvent.endTime
		) {
			return [];
		}

		const newStart = new Date(
			`${newEvent.startDate}T${newEvent.startTime}`
		);
		const newEnd = new Date(`${newEvent.endDate}T${newEvent.endTime}`);

		return existingEvents.filter((event) => {
			if (excludeEventId && event.id === excludeEventId) {
				return false;
			}

			const existingStart = new Date(
				`${event.startDate}T${event.startTime}`
			);
			const existingEnd = new Date(`${event.endDate}T${event.endTime}`);

			// Check for overlap
			return newStart < existingEnd && newEnd > existingStart;
		});
	}, [newEvent, existingEvents, excludeEventId]);
}

// Hook: optimized event operations with undo/redo
export function useEventOperations(initialEvents: Event[] = []) {
	const [events, setEvents] = useState<Event[]>(initialEvents);
	const [history, setHistory] = useState<Event[][]>([initialEvents]);
	const [historyIndex, setHistoryIndex] = useState(0);

	const addToHistory = useCallback(
		(newEvents: Event[]) => {
			const newHistory = history.slice(0, historyIndex + 1);
			newHistory.push([...newEvents]);
			setHistory(newHistory);
			setHistoryIndex(newHistory.length - 1);
		},
		[history, historyIndex]
	);

	const addEvent = useCallback(
		(event: Event) => {
			const newEvents = [...events, event];
			setEvents(newEvents);
			addToHistory(newEvents);
		},
		[events, addToHistory]
	);

	const updateEvent = useCallback(
		(updatedEvent: Event) => {
			const newEvents = events.map((event) =>
				event.id === updatedEvent.id ? updatedEvent : event
			);
			setEvents(newEvents);
			addToHistory(newEvents);
		},
		[events, addToHistory]
	);

	const deleteEvent = useCallback(
		(eventId: string | number) => {
			const newEvents = events.filter((event) => event.id !== eventId);
			setEvents(newEvents);
			addToHistory(newEvents);
		},
		[events, addToHistory]
	);

	const undo = useCallback(() => {
		if (historyIndex > 0) {
			const newIndex = historyIndex - 1;
			setHistoryIndex(newIndex);
			setEvents([...history[newIndex]]);
		}
	}, [history, historyIndex]);

	const redo = useCallback(() => {
		if (historyIndex < history.length - 1) {
			const newIndex = historyIndex + 1;
			setHistoryIndex(newIndex);
			setEvents([...history[newIndex]]);
		}
	}, [history, historyIndex]);

	const canUndo = historyIndex > 0;
	const canRedo = historyIndex < history.length - 1;

	return {
		events,
		addEvent,
		updateEvent,
		deleteEvent,
		undo,
		redo,
		canUndo,
		canRedo,
		setEvents,
	};
}

// Hook: calendar navigation
export function useCalendarNavigation(initialDate: Date = new Date()) {
	const [currentDate, setCurrentDate] = useState(initialDate);
	const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">(
		"weekly"
	);

	const navigateToDate = useCallback((date: Date) => {
		setCurrentDate(date);
	}, []);

	const navigatePrevious = useCallback(() => {
		const newDate = new Date(currentDate);
		switch (viewMode) {
			case "daily":
				newDate.setDate(newDate.getDate() - 1);
				break;
			case "weekly":
				newDate.setDate(newDate.getDate() - 7);
				break;
			case "monthly":
				newDate.setMonth(newDate.getMonth() - 1);
				break;
		}
		setCurrentDate(newDate);
	}, [currentDate, viewMode]);

	const navigateNext = useCallback(() => {
		const newDate = new Date(currentDate);
		switch (viewMode) {
			case "daily":
				newDate.setDate(newDate.getDate() + 1);
				break;
			case "weekly":
				newDate.setDate(newDate.getDate() + 7);
				break;
			case "monthly":
				newDate.setMonth(newDate.getMonth() + 1);
				break;
		}
		setCurrentDate(newDate);
	}, [currentDate, viewMode]);

	const goToToday = useCallback(() => {
		setCurrentDate(new Date());
	}, []);

	return {
		currentDate,
		viewMode,
		setViewMode,
		navigateToDate,
		navigatePrevious,
		navigateNext,
		goToToday,
	};
}

// Hook: keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			const ctrlKey = event.ctrlKey || event.metaKey;
			const shiftKey = event.shiftKey;
			const altKey = event.altKey;

			let shortcutKey = "";
			if (ctrlKey) shortcutKey += "ctrl+";
			if (shiftKey) shortcutKey += "shift+";
			if (altKey) shortcutKey += "alt+";
			shortcutKey += key;

			const handler = shortcuts[shortcutKey];
			if (handler) {
				event.preventDefault();
				handler();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [shortcuts]);
}

// Utility: optimized event grouping
export const groupEventsByDate = (events: Event[]): Record<string, Event[]> => {
	const grouped: Record<string, Event[]> = {};

	events.forEach((event) => {
		const dateKey = event.startDate;
		if (!grouped[dateKey]) {
			grouped[dateKey] = [];
		}
		grouped[dateKey].push(event);
	});

	// Sort events within each date group
	Object.keys(grouped).forEach((date) => {
		grouped[date].sort((a, b) => {
			const aTime = a.startTime.localeCompare(b.startTime);
			return aTime !== 0 ? aTime : a.title.localeCompare(b.title);
		});
	});

	return grouped;
};

// Utility: get next available time slot
export const getNextAvailableTimeSlot = (
	events: Event[],
	date: string,
	duration: number = 30
): { startTime: string; endTime: string } | null => {
	const dayEvents = events.filter((event) => event.startDate === date);
	const busySlots = dayEvents
		.map((event) => ({
			start: event.startTime,
			end: event.endTime,
		}))
		.sort((a, b) => a.start.localeCompare(b.start));

	const businessStart = "09:00";
	const businessEnd = "17:00";

	// Helper to convert time string to minutes
	const timeToMinutes = (time: string): number => {
		const [hours, minutes] = time.split(":").map(Number);
		return hours * 60 + minutes;
	};

	// Helper to convert minutes to time string
	const minutesToTime = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours.toString().padStart(2, "0")}:${mins
			.toString()
			.padStart(2, "0")}`;
	};

	let currentTime = timeToMinutes(businessStart);
	const endTime = timeToMinutes(businessEnd);

	for (const slot of busySlots) {
		const slotStart = timeToMinutes(slot.start);

		if (currentTime + duration <= slotStart) {
			return {
				startTime: minutesToTime(currentTime),
				endTime: minutesToTime(currentTime + duration),
			};
		}

		currentTime = Math.max(currentTime, timeToMinutes(slot.end));
	}

	// Check if there's time at the end of the day
	if (currentTime + duration <= endTime) {
		return {
			startTime: minutesToTime(currentTime),
			endTime: minutesToTime(currentTime + duration),
		};
	}

	return null; // No available slots
};

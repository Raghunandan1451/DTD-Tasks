import {
	DateColumn,
	Event,
	EventFormData,
	ValidationErrors,
	ValidationRules,
} from "@src/features/event/type";

// Generate date columns for daily or weekly view
export function getDateColumns(
	currentDate: Date,
	viewMode: "daily" | "weekly"
) {
	const columns: DateColumn[] = [];

	if (viewMode === "daily") {
		const today = new Date();
		columns.push({
			date: currentDate,
			dateString: currentDate.toISOString().split("T")[0],
			isToday: currentDate.toDateString() === today.toDateString(),
		});
	} else {
		const startOfWeek = new Date(currentDate);
		const day = startOfWeek.getDay();
		const diff = startOfWeek.getDate() - day;
		startOfWeek.setDate(diff);

		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			const today = new Date();

			columns.push({
				date,
				dateString: date.toISOString().split("T")[0],
				isToday: date.toDateString() === today.toDateString(),
			});
		}
	}

	return columns;
}

// Fixed recurring event instance generation
// Fixed recurring event instance generation with excludedDates support
export function generateRecurringInstances(
	events: Event[],
	dateColumns: DateColumn[]
): Event[] {
	const instances: Event[] = [];

	// Get the date range we need to consider (visible dates + some buffer)
	const visibleDates = dateColumns.map((col) => col.dateString);
	const earliestDate = visibleDates[0];
	const latestDate = visibleDates[visibleDates.length - 1];

	// Add buffer for multi-day events
	const startDate = new Date(earliestDate);
	startDate.setDate(startDate.getDate() - 1);
	const endDate = new Date(latestDate);
	endDate.setDate(endDate.getDate() + 1);

	events.forEach((event) => {
		// Check for both new repeatType structure and legacy recurring structure
		const repeatType = event.repeatType || event.recurring?.type;
		const repeatLimit = event.repeatLimit;
		const recurringConfig = event.recurring;

		if (!repeatType || repeatType === "none") {
			// Non-recurring event - add as is
			instances.push(event);
			return;
		}

		// CRITICAL: Get excluded dates for this event
		const excludedDates = new Set(event.excludedDates || []);

		const baseDate = new Date(event.startDate);
		let occurrenceCount = 0;
		const maxOccurrences = repeatLimit || 1000;

		// Generate instances within the visible range
		const generateInstances = (baseDate: Date, type: string) => {
			const currentDate = new Date(baseDate);
			const interval = recurringConfig?.interval || 1;

			// For weekly events with specific days
			if (
				type === "weekly" &&
				recurringConfig?.daysOfWeek &&
				recurringConfig.daysOfWeek.length > 0
			) {
				const daysOfWeek = recurringConfig.daysOfWeek.sort();
				let weekCount = 0;

				while (occurrenceCount < maxOccurrences) {
					const weekStart = new Date(baseDate);
					weekStart.setDate(
						baseDate.getDate() + weekCount * 7 * interval
					);

					for (const dayOfWeek of daysOfWeek) {
						if (occurrenceCount >= maxOccurrences) break;

						const eventDate = new Date(weekStart);
						const currentWeekDay = weekStart.getDay();
						const daysToAdd = (dayOfWeek - currentWeekDay + 7) % 7;
						eventDate.setDate(weekStart.getDate() + daysToAdd);

						if (eventDate >= startDate && eventDate <= endDate) {
							const dateString = eventDate
								.toISOString()
								.split("T")[0];

							// CRITICAL: Skip if this date is excluded
							if (!excludedDates.has(dateString)) {
								const instanceId = `${event.id}-${dateString}`;
								instances.push({
									...event,
									id: instanceId,
									startDate: dateString,
								});
							}
						}

						occurrenceCount++;
					}

					weekCount++;

					const checkDate = new Date(weekStart);
					checkDate.setDate(weekStart.getDate() + 7);
					if (
						checkDate > endDate &&
						occurrenceCount >= maxOccurrences
					) {
						break;
					}
				}
				return;
			}

			// Handle other repeat types (daily, weekly without specific days, monthly)
			while (occurrenceCount < maxOccurrences) {
				const dateString = currentDate.toISOString().split("T")[0];

				// For monthly events with specific day of month
				if (type === "monthly" && recurringConfig?.dayOfMonth) {
					if (currentDate.getDate() === recurringConfig.dayOfMonth) {
						if (
							currentDate >= startDate &&
							currentDate <= endDate
						) {
							// CRITICAL: Skip if this date is excluded
							if (!excludedDates.has(dateString)) {
								const instanceId = `${event.id}-${dateString}`;
								instances.push({
									...event,
									id: instanceId,
									startDate: dateString,
								});
							}
						}
						occurrenceCount++;
					}
				} else {
					// For daily and simple weekly events
					if (currentDate >= startDate && currentDate <= endDate) {
						// CRITICAL: Skip if this date is excluded
						if (!excludedDates.has(dateString)) {
							const instanceId = `${event.id}-${dateString}`;
							instances.push({
								...event,
								id: instanceId,
								startDate: dateString,
							});
						}
					}
					occurrenceCount++;
				}

				// Move to next occurrence based on repeat type
				switch (type) {
					case "daily": {
						currentDate.setDate(currentDate.getDate() + interval);
						break;
					}
					case "weekly": {
						currentDate.setDate(
							currentDate.getDate() + 7 * interval
						);
						break;
					}
					case "monthly": {
						const originalDay = currentDate.getDate();
						currentDate.setMonth(currentDate.getMonth() + interval);

						if (recurringConfig?.dayOfMonth) {
							currentDate.setDate(
								Math.min(
									recurringConfig.dayOfMonth,
									getLastDayOfMonth(currentDate)
								)
							);
						} else {
							const lastDayOfMonth =
								getLastDayOfMonth(currentDate);
							currentDate.setDate(
								Math.min(originalDay, lastDayOfMonth)
							);
						}
						break;
					}
				}

				if (
					currentDate > endDate &&
					occurrenceCount >= maxOccurrences
				) {
					break;
				}
			}
		};

		generateInstances(baseDate, repeatType);
	});

	return instances;
}

// Helper function to get the last day of a month
function getLastDayOfMonth(date: Date): number {
	const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
	return lastDay.getDate();
}

// Function to get the base event ID from an instance ID
export function getBaseEventId(instanceId: string): string {
	const firstDashIndex = instanceId.indexOf("-");
	return firstDashIndex !== -1
		? instanceId.substring(0, firstDashIndex)
		: instanceId;
}

// Helpers
export function isMultiDayEvent(event: Event): boolean {
	const startHour = parseInt(event.startTime.split(":")[0]);
	const endHour = parseInt(event.endTime.split(":")[0]);
	const startMinute = parseInt(event.startTime.split(":")[1]);
	const endMinute = parseInt(event.endTime.split(":")[1]);

	const startTotalMinutes = startHour * 60 + startMinute;
	const endTotalMinutes = endHour * 60 + endMinute;

	return endTotalMinutes < startTotalMinutes;
}

export function getNextDayString(dateString: string): string {
	const date = new Date(dateString);
	date.setDate(date.getDate() + 1);
	return date.toISOString().split("T")[0];
}

export function getPreviousDayString(dateString: string): string {
	const date = new Date(dateString);
	date.setDate(date.getDate() - 1);
	return date.toISOString().split("T")[0];
}

export function getEventHeight(event: Event, columnDate: string): number {
	const startHour = parseInt(event.startTime.split(":")[0]);
	const startMinute = parseInt(event.startTime.split(":")[1]);
	const endHour = parseInt(event.endTime.split(":")[0]);
	const endMinute = parseInt(event.endTime.split(":")[1]);

	const isEventMultiDay = isMultiDayEvent(event);
	const isStartDay = event.startDate === columnDate;
	const isEndDay =
		!isStartDay &&
		isEventMultiDay &&
		getNextDayString(event.startDate) === columnDate;

	if (isEventMultiDay) {
		if (isStartDay) {
			// First day: from start time to midnight (24:00)
			const duration = 24 * 60 - (startHour * 60 + startMinute);
			return Math.max(40, (duration / 60) * 60);
		} else if (isEndDay) {
			// Second day: from midnight to end time
			const duration = endHour * 60 + endMinute;
			return Math.max(40, (duration / 60) * 60);
		}
	}

	// Single day event
	const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
	return Math.max(40, (duration / 60) * 60);
}

export function getEventTop(event: Event, columnDate: string): number {
	const startHour = parseInt(event.startTime.split(":")[0]);
	const startMinute = parseInt(event.startTime.split(":")[1]);

	const isEventMultiDay = isMultiDayEvent(event);
	const isStartDay = event.startDate === columnDate;
	const isEndDay =
		!isStartDay &&
		isEventMultiDay &&
		getNextDayString(event.startDate) === columnDate;

	if (isEventMultiDay && isEndDay) {
		// Second day: start from top (midnight)
		return 0;
	}

	// First day or single day: start from actual start time
	return startHour * 60 + startMinute * 1;
}

export function getEventsForColumn(
	columnDate: string,
	events: Event[],
	dateColumns: DateColumn[]
): Event[] {
	// First generate all expanded instances for this set of events
	const instances = generateRecurringInstances(events, dateColumns);

	return instances.filter((event: Event) => {
		// Include events that start on this day
		if (event.startDate === columnDate) {
			return true;
		}

		// Include multi-day events that started the previous day and end on this day
		const previousDay = getPreviousDayString(columnDate);
		if (event.startDate === previousDay && isMultiDayEvent(event)) {
			return true;
		}

		return false;
	});
}

export function getRecurringIndicator(event: Event): string {
	const repeatType = event.repeatType || event.recurring?.type;
	const repeatLimit = event.repeatLimit;
	const recurringConfig = event.recurring;

	if (!repeatType || repeatType === "none") return "";

	const interval = recurringConfig?.interval || 1;
	const daysOfWeek = recurringConfig?.daysOfWeek;

	let baseText = "";
	switch (repeatType) {
		case "daily":
			baseText = interval === 1 ? "Daily" : `Every ${interval} days`;
			break;
		case "weekly":
			if (daysOfWeek && daysOfWeek.length > 0) {
				const dayNames = [
					"Sun",
					"Mon",
					"Tue",
					"Wed",
					"Thu",
					"Fri",
					"Sat",
				];
				const selectedDays = daysOfWeek
					.map((d) => dayNames[d])
					.join(", ");
				baseText = `Weekly (${selectedDays})`;
			} else {
				baseText =
					interval === 1 ? "Weekly" : `Every ${interval} weeks`;
			}
			break;
		case "monthly":
			baseText = interval === 1 ? "Monthly" : `Every ${interval} months`;
			break;
		default:
			baseText = "";
	}

	// Add repeat limit if specified
	if (repeatLimit && repeatLimit > 1) {
		baseText += ` (${repeatLimit}x)`;
	}

	return baseText;
}
export const validateForm = (
	data: Record<string, unknown>,
	rules: ValidationRules
): ValidationErrors => {
	const errors: ValidationErrors = {};

	Object.keys(rules).forEach((field) => {
		const value = data[field];
		const fieldRules = rules[field];

		for (const rule of fieldRules) {
			// Required validation
			if (
				rule.required &&
				(!value || (typeof value === "string" && !value.trim()))
			) {
				errors[field] = rule.message;
				break;
			}

			// Skip other validations if value is empty and not required
			if (!value) continue;

			// String length validations
			if (typeof value === "string") {
				if (rule.minLength && value.length < rule.minLength) {
					errors[field] = rule.message;
					break;
				}
				if (rule.maxLength && value.length > rule.maxLength) {
					errors[field] = rule.message;
					break;
				}
				if (rule.pattern && !rule.pattern.test(value)) {
					errors[field] = rule.message;
					break;
				}
			}

			// Custom validation
			if (rule.custom && !rule.custom(value)) {
				errors[field] = rule.message;
				break;
			}
		}
	});

	return errors;
};

// utils/dateTime.ts
export const pad = (n: number): string => n.toString().padStart(2, "0");

export const getCurrentDate = (): string =>
	new Date().toISOString().split("T")[0];

export const getCurrentTime = (): string => {
	const now = new Date();
	return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

export const addMinutes = (time: string, minutes: number): string => {
	const [hours, mins] = time.split(":").map(Number);
	const date = new Date();
	date.setHours(hours, mins + minutes);
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const isValidTimeRange = (
	startDate: string,
	startTime: string,
	endDate: string,
	endTime: string
): boolean => {
	const start = new Date(`${startDate}T${startTime}`);
	const end = new Date(`${endDate}T${endTime}`);
	return end > start;
};

export function updateEventFormData(
	currentData: EventFormData,
	updates: Partial<EventFormData>
): EventFormData {
	const result: EventFormData = { ...currentData };

	// Explicit property updates with type safety
	if (updates.title !== undefined) result.title = updates.title;
	if (updates.content !== undefined) result.content = updates.content;
	if (updates.tag !== undefined) result.tag = updates.tag;
	if (updates.startDate !== undefined) result.startDate = updates.startDate;
	if (updates.endDate !== undefined) result.endDate = updates.endDate;
	if (updates.startTime !== undefined) result.startTime = updates.startTime;
	if (updates.endTime !== undefined) result.endTime = updates.endTime;
	if (updates.color !== undefined) result.color = updates.color;
	if (updates.repeatType !== undefined)
		result.repeatType = updates.repeatType;
	if (updates.repeatLimit !== undefined)
		result.repeatLimit = updates.repeatLimit;

	return result;
}

export function applyDefaultRepeatLimit(event: Event): Event {
	if (event.repeatType && event.repeatType !== "none") {
		if (!event.repeatLimit || event.repeatLimit === 0) {
			switch (event.repeatType) {
				case "daily":
					event.repeatLimit = 90;
					break;
				case "weekly":
					event.repeatLimit = 13;
					break;
				case "monthly":
					event.repeatLimit = 3;
					break;
			}
		}
	}
	return event;
}

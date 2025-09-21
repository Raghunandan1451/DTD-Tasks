import { DateColumn, Event } from "@src/features/event/type";

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

		const baseDate = new Date(event.startDate);
		let occurrenceCount = 0;
		const maxOccurrences = repeatLimit || 1000; // Use repeatLimit or default

		// Generate instances within the visible range
		const generateInstances = (baseDate: Date, type: string) => {
			const currentDate = new Date(baseDate);
			const interval = recurringConfig?.interval || 1;

			// For weekly events with specific days, we need special handling
			if (
				type === "weekly" &&
				recurringConfig?.daysOfWeek &&
				recurringConfig.daysOfWeek.length > 0
			) {
				const daysOfWeek = recurringConfig.daysOfWeek.sort();
				let weekCount = 0;

				while (occurrenceCount < maxOccurrences) {
					// Calculate the start of the current week
					const weekStart = new Date(baseDate);
					weekStart.setDate(
						baseDate.getDate() + weekCount * 7 * interval
					);

					// For each specified day of the week in this week
					for (const dayOfWeek of daysOfWeek) {
						if (occurrenceCount >= maxOccurrences) break;

						const eventDate = new Date(weekStart);
						const currentWeekDay = weekStart.getDay();
						const daysToAdd = (dayOfWeek - currentWeekDay + 7) % 7;
						eventDate.setDate(weekStart.getDate() + daysToAdd);

						// Only include if within our date range
						if (eventDate >= startDate && eventDate <= endDate) {
							const dateString = eventDate
								.toISOString()
								.split("T")[0];
							const instanceId = `${event.id}-${dateString}`;
							instances.push({
								...event,
								id: instanceId,
								startDate: dateString,
							});
						}

						occurrenceCount++;
					}

					weekCount++;

					// Safety check: if we've gone way past our end date, break
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
						// Check if this date is within our visible range
						if (
							currentDate >= startDate &&
							currentDate <= endDate
						) {
							const instanceId = `${event.id}-${dateString}`;
							instances.push({
								...event,
								id: instanceId,
								startDate: dateString,
							});
						}
						occurrenceCount++;
					}
				} else {
					// For daily and simple weekly events
					// Check if this date is within our visible range
					if (currentDate >= startDate && currentDate <= endDate) {
						const instanceId = `${event.id}-${dateString}`;
						instances.push({
							...event,
							id: instanceId,
							startDate: dateString,
						});
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
						// Simple weekly (every N weeks, same day)
						currentDate.setDate(
							currentDate.getDate() + 7 * interval
						);
						break;
					}
					case "monthly": {
						const originalDay = currentDate.getDate();
						currentDate.setMonth(currentDate.getMonth() + interval);

						// Handle month overflow (e.g., Jan 31 -> Feb 28)
						if (recurringConfig?.dayOfMonth) {
							currentDate.setDate(
								Math.min(
									recurringConfig.dayOfMonth,
									getLastDayOfMonth(currentDate)
								)
							);
						} else {
							// Try to maintain the same day of month, but handle overflow
							const lastDayOfMonth =
								getLastDayOfMonth(currentDate);
							currentDate.setDate(
								Math.min(originalDay, lastDayOfMonth)
							);
						}
						break;
					}
				}

				// Safety check: if we've gone way past our end date and we have enough occurrences, break
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

// Function to delete a specific recurring event instance
export function deleteRecurringInstance(
	events: Event[],
	instanceId: string,
	dateColumns: DateColumn[]
): Event[] {
	// Generate all instances
	const allInstances = generateRecurringInstances(events, dateColumns);

	// Filter out the specific instance to delete
	return allInstances.filter((instance) => instance.id !== instanceId);
}

// Function to delete all instances of a recurring event
export function deleteAllRecurringInstances(
	events: Event[],
	baseEventId: string
): Event[] {
	return events.filter((event) => event.id !== baseEventId);
}

// Function to get the base event ID from an instance ID
export function getBaseEventId(instanceId: string): string {
	// Instance IDs are in format: "baseId-dateString"
	const parts = instanceId.split("-");
	// Remove the last part (date) and rejoin
	return parts.slice(0, -1).join("-");
}

// Simplified recurring instances function (uses the fixed generateRecurringInstances)
export function getRecurringInstances(
	events: Event[],
	dateColumns: DateColumn[]
) {
	return generateRecurringInstances(events, dateColumns);
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

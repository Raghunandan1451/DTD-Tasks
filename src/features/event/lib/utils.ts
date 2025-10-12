import {
	DateColumn,
	Event,
	EventFormData,
	ValidationErrors,
	ValidationRules,
} from "@src/features/event/type";
import { setCurrentDate } from "@src/lib/store/slices/calendarSlice";
import { AppDispatch } from "@src/lib/store/store";

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

export const navigateDate = (
	dispatch: AppDispatch,
	currentDate: string,
	viewMode: "daily" | "weekly",
	direction: "prev" | "next"
) => {
	const newDate = new Date(currentDate);
	if (viewMode === "weekly") {
		newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
	} else {
		newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
	}
	dispatch(setCurrentDate(newDate.toISOString().split("T")[0]));
};

export const getDateRange = (
	currentDate: string,
	viewMode: "daily" | "weekly"
) => {
	const baseDate = new Date(currentDate);

	if (viewMode === "weekly") {
		const startOfWeek = new Date(baseDate);
		const day = startOfWeek.getDay();
		startOfWeek.setDate(startOfWeek.getDate() - day);

		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);

		return {
			start: startOfWeek,
			end: endOfWeek,
			label: `${startOfWeek.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			})} - ${endOfWeek.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})}`,
		};
	}

	return {
		start: baseDate,
		end: baseDate,
		label: baseDate.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			year: "numeric",
		}),
	};
};

// colorUtils.ts - Convert modern CSS colors to hex for html2canvas compatibility

/**
 * Converts oklch/oklab colors to hex format
 * Example: oklch(0.7 0.15 180) -> #00bfa5
 */
export const convertOklchToHex = (oklchString: string): string => {
	const match = oklchString.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
	if (!match) return oklchString;

	const [, l, c, h] = match.map(Number);

	// Convert OKLCH to linear RGB
	const { r, g, b } = oklchToRgb(l, c, h);

	// Convert to hex
	const toHex = (n: number) => {
		const hex = Math.round(Math.max(0, Math.min(255, n * 255)))
			.toString(16)
			.padStart(2, "0");
		return hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * OKLCH to RGB conversion using color space math
 */
const oklchToRgb = (
	l: number,
	c: number,
	h: number
): { r: number; g: number; b: number } => {
	// Convert OKLCH to OKLAB
	const hRad = (h * Math.PI) / 180;
	const a = c * Math.cos(hRad);
	const b = c * Math.sin(hRad);

	// Convert OKLAB to linear RGB
	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;

	const l3 = l_ * l_ * l_;
	const m3 = m_ * m_ * m_;
	const s3 = s_ * s_ * s_;

	const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
	const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
	const b_ = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

	// Convert linear RGB to sRGB (gamma correction)
	const toSrgb = (val: number) => {
		if (val <= 0.0031308) return 12.92 * val;
		return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
	};

	return {
		r: toSrgb(r),
		g: toSrgb(g),
		b: toSrgb(b_),
	};
};

/**
 * HSL to Hex conversion
 */
const hslToHex = (h: number, s: number, l: number): string => {
	s /= 100;
	l /= 100;

	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) =>
		l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

	const toHex = (val: number) =>
		Math.round(val * 255)
			.toString(16)
			.padStart(2, "0");

	return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

/**
 * Converts any modern CSS color format to hex
 * Supports: oklch, oklab, rgb, rgba, hsl, hsla
 */
export const normalizeColorToHex = (color: string): string => {
	if (!color) return "#000000";

	// Already hex
	if (color.startsWith("#")) return color;

	// OKLCH
	if (color.startsWith("oklch")) {
		return convertOklchToHex(color);
	}

	// RGB/RGBA
	const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (rgbMatch) {
		const [, r, g, b] = rgbMatch.map(Number);
		const toHex = (n: number) => n.toString(16).padStart(2, "0");
		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}

	// HSL/HSLA
	const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
	if (hslMatch) {
		const [, h, s, l] = hslMatch.map(Number);
		return hslToHex(h, s, l);
	}

	// Fallback: use canvas to convert
	try {
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 1;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.fillStyle = color;
			return ctx.fillStyle; // Browser converts to hex
		}
	} catch (e) {
		console.warn("Color conversion failed:", color, e);
	}

	return "#000000"; // Fallback
};

/**
 * Pre-process an HTML element to convert all colors to hex
 * This modifies the element in-place before html2canvas processes it
 */
export const normalizeElementColors = (element: HTMLElement): void => {
	// Normalize inline styles
	if (element.style.color) {
		element.style.color = normalizeColorToHex(element.style.color);
	}
	if (element.style.backgroundColor) {
		element.style.backgroundColor = normalizeColorToHex(
			element.style.backgroundColor
		);
	}
	if (element.style.borderColor) {
		element.style.borderColor = normalizeColorToHex(
			element.style.borderColor
		);
	}
	if (element.style.borderLeftColor) {
		element.style.borderLeftColor = normalizeColorToHex(
			element.style.borderLeftColor
		);
	}

	// Normalize computed styles by applying them as inline styles
	const computed = window.getComputedStyle(element);
	const colorProps = [
		"color",
		"backgroundColor",
		"borderColor",
		"borderLeftColor",
		"borderRightColor",
		"borderTopColor",
		"borderBottomColor",
	] as const;

	colorProps.forEach((prop) => {
		const value = computed[prop];
		if (
			typeof value === "string" &&
			value &&
			value !== "rgba(0, 0, 0, 0)" &&
			value !== "transparent"
		) {
			const hexColor = normalizeColorToHex(value);
			element.style.setProperty(prop, hexColor);
		}
	});

	// Recursively process children
	Array.from(element.children).forEach((child) => {
		if (child instanceof HTMLElement) {
			normalizeElementColors(child);
		}
	});
};

// ============================================
// Calendar Screenshot Generation
// ============================================

/**
 * Generates a weekly calendar screenshot for printing
 * @param events - Array of calendar events
 * @param currentDate - Current date to center the week around
 * @returns PNG blob of the weekly calendar view
 */
import { domToBlob } from "modern-screenshot";

export const generateWeeklyCalendarScreenshot = async (
	events: Event[],
	currentDate: string
): Promise<Blob | null> => {
	try {
		const container = document.createElement("div");
		container.style.cssText = `
	position: absolute;
	top: 0;
	left: 0;
	width: 1400px;
	padding: 20px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	font-family: system-ui, -apple-system, sans-serif;
	pointer-events: none;
	opacity: 0;
`;

		const date = new Date(currentDate);
		const dayOfWeek = date.getDay();
		const startOfWeek = new Date(date);
		startOfWeek.setDate(date.getDate() - dayOfWeek);

		const weekDays = Array.from({ length: 7 }, (_, i) => {
			const day = new Date(startOfWeek);
			day.setDate(startOfWeek.getDate() + i);
			return day;
		});

		// Simple markdown formatter for event content
		// Simple markdown formatter for event content
		const formatContent = (content: string): string => {
			if (!content) return "";

			let html = content;

			// Code blocks: ```code``` - PROCESS FIRST, trim the captured content
			html = html.replace(/```\s*([\s\S]*?)\s*```/g, (_, code) => {
				const trimmedCode = code.trim();
				return `<pre style="background: #f5f5f5; border: 1px solid #e0e0e0; margin: 8px 0; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #1a1a1a; white-space: pre-wrap; line-height: 1.4;">${trimmedCode}</pre>`;
			});

			// Inline code: `code` - PROCESS SECOND, use inline styling
			html = html.replace(
				/`([^`]+)`/g,
				'<code style="background:#f5f5f5; padding:2px 4px; border-radius:3px; font-family:monospace; font-size:11px;">$1</code>'
			);

			// Handle lines: split and process
			const lines = html.split("\n");
			const processedLines: string[] = [];
			let inList = false;
			let inBlockquote = false;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				// Check for headers (must be at start of line)
				const h3Match = line.match(/^###\s+(.+)$/);
				const h2Match = line.match(/^##\s+(.+)$/);
				const h1Match = line.match(/^#\s+(.+)$/);

				// Check for blockquote
				const blockquoteMatch = line.match(/^>\s+(.+)$/);

				// Check for list
				const listMatch = line.match(/^[-*]\s+(.+)$/);

				if (h3Match) {
					// Close list or blockquote if open
					if (inList) {
						processedLines.push("</ul>");
						inList = false;
					}
					if (inBlockquote) {
						processedLines.push("</blockquote>");
						inBlockquote = false;
					}
					processedLines.push(
						`<h3 style="font-size: 14px; font-weight: 700; color: #333; margin: 12px 0 6px 0; line-height: 1.4;">${h3Match[1]}</h3>`
					);
				} else if (h2Match) {
					if (inList) {
						processedLines.push("</ul>");
						inList = false;
					}
					if (inBlockquote) {
						processedLines.push("</blockquote>");
						inBlockquote = false;
					}
					processedLines.push(
						`<h2 style="font-size: 16px; font-weight: 700; color: #333; margin: 14px 0 8px 0; line-height: 1.3;">${h2Match[1]}</h2>`
					);
				} else if (h1Match) {
					if (inList) {
						processedLines.push("</ul>");
						inList = false;
					}
					if (inBlockquote) {
						processedLines.push("</blockquote>");
						inBlockquote = false;
					}
					processedLines.push(
						`<h1 style="font-size: 18px; font-weight: 700; color: #333; margin: 16px 0 10px 0; line-height: 1.2;">${h1Match[1]}</h1>`
					);
				} else if (blockquoteMatch) {
					// Close list if open
					if (inList) {
						processedLines.push("</ul>");
						inList = false;
					}
					// Start blockquote if not already started
					if (!inBlockquote) {
						processedLines.push(
							'<blockquote style="border-left: 4px solid #667eea; padding-left: 12px; margin: 8px 0; color: #555; font-style: italic; background: #f9f9f9; padding: 8px 12px; border-radius: 4px;">'
						);
						inBlockquote = true;
					}
					processedLines.push(
						`<div style="line-height: 1.6;">${blockquoteMatch[1]}</div>`
					);
				} else if (listMatch) {
					// Close blockquote if open
					if (inBlockquote) {
						processedLines.push("</blockquote>");
						inBlockquote = false;
					}
					// Start list if not already started
					if (!inList) {
						processedLines.push(
							'<ul style="padding-left: 20px; list-style-type: disc; margin: 4px 0;">'
						);
						inList = true;
					}
					processedLines.push(
						`<li style="line-height: 1.6; margin-bottom: 4px;">${listMatch[1]}</li>`
					);
				} else {
					// Close list or blockquote if open
					if (inList) {
						processedLines.push("</ul>");
						inList = false;
					}
					if (inBlockquote) {
						processedLines.push("</blockquote>");
						inBlockquote = false;
					}
					// Only add <br> for normal lines
					if (line.trim()) {
						processedLines.push(line + "<br>");
					}
				}
			}

			// Close list or blockquote if still open at the end
			if (inList) {
				processedLines.push("</ul>");
			}
			if (inBlockquote) {
				processedLines.push("</blockquote>");
			}

			html = processedLines.join("");

			// Bold: **text**
			html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

			// Italic: *text* (single asterisk, not part of **)
			html = html.replace(
				/(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g,
				"<em>$1</em>"
			);

			// Underline: __text__
			html = html.replace(/__([^_]+)__/g, "<u>$1</u>");

			// Strikethrough: ~~text~~
			html = html.replace(/~~([^~]+)~~/g, "<s>$1</s>");

			return html;
		};

		// Process events: group by day and handle multi-day events
		interface DayEvent extends Event {
			isStart: boolean;
			isEnd: boolean;
			displayStartTime: string;
			displayEndTime: string;
		}

		const eventsByDay = new Map<number, DayEvent[]>();

		// Initialize empty arrays for each day
		weekDays.forEach((_, idx) => eventsByDay.set(idx, []));

		events.forEach((ev) => {
			const startDayIndex = weekDays.findIndex(
				(d) => d.toISOString().split("T")[0] === ev.startDate
			);
			const endDayIndex = weekDays.findIndex(
				(d) => d.toISOString().split("T")[0] === ev.endDate
			);

			// Skip if event doesn't appear in this week
			if (startDayIndex === -1 && endDayIndex === -1) return;

			const actualStartIdx = startDayIndex === -1 ? 0 : startDayIndex;
			const actualEndIdx = endDayIndex === -1 ? 6 : endDayIndex;

			const isMultiDay = ev.startDate !== ev.endDate;

			if (!isMultiDay) {
				// Single day event
				if (startDayIndex !== -1) {
					eventsByDay.get(startDayIndex)?.push({
						...ev,
						isStart: true,
						isEnd: true,
						displayStartTime: ev.startTime,
						displayEndTime: ev.endTime,
					});
				}
			} else {
				// Multi-day event: add to each day
				for (
					let dayIdx = actualStartIdx;
					dayIdx <= actualEndIdx;
					dayIdx++
				) {
					const isFirstDay = dayIdx === actualStartIdx;
					const isLastDay = dayIdx === actualEndIdx;

					eventsByDay.get(dayIdx)?.push({
						...ev,
						isStart: isFirstDay,
						isEnd: isLastDay,
						displayStartTime: ev.startTime,
						displayEndTime: ev.endTime,
					});
				}
			}
		});

		// Sort events by start time within each day
		eventsByDay.forEach((dayEvents) => {
			dayEvents.sort((a, b) => {
				const aTime = a.displayStartTime.replace(":", "");
				const bTime = b.displayStartTime.replace(":", "");
				return aTime.localeCompare(bTime);
			});
		});

		// Generate HTML for each day column
		const dayColumns = weekDays
			.map((d, dayIdx) => {
				const dayEvents = eventsByDay.get(dayIdx) || [];
				const isToday = d.toDateString() === new Date().toDateString();

				const eventsHTML =
					dayEvents.length > 0
						? dayEvents
								.map((ev) => {
									const hexColor = normalizeColorToHex(
										ev.color
									);
									const isMultiDay = !ev.isStart || !ev.isEnd;

									let positionIndicator = "";
									if (isMultiDay) {
										if (ev.isStart && !ev.isEnd) {
											positionIndicator = `<div style="display: inline-block; background: ${hexColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; margin-top: 4px;">STARTS HERE →</div>`;
										} else if (!ev.isStart && ev.isEnd) {
											positionIndicator = `<div style="display: inline-block; background: ${hexColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; margin-top: 4px;">← ENDS HERE</div>`;
										} else if (!ev.isStart && !ev.isEnd) {
											positionIndicator = `<div style="display: inline-block; background: ${hexColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; margin-top: 4px;">← CONTINUES →</div>`;
										}
									}

									return `
									<div style="
										background: ${hexColor}15;
										border-left: 4px solid ${hexColor};
										border-radius: 6px;
										padding: 12px;
										margin-bottom: 8px;
										box-shadow: 0 2px 4px rgba(0,0,0,0.1);
										transition: transform 0.2s;
									">
										<div style="font-weight: 700; font-size: 14px; color: #1a1a1a; margin-bottom: 6px; line-height: 1.3;">
											${ev.title}
										</div>
										<div style="font-size: 12px; color: #4a4a4a; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
											<span style="font-size: 14px;">🕐</span>
											${ev.displayStartTime} - ${ev.displayEndTime}
										</div>
										${
											ev.content
												? `<div style="font-size: 12px; color: #2a2a2a; line-height: 1.6; margin-top: 8px; padding-top: 8px; border-top: 2px solid ${hexColor}40; font-weight: 500;">${formatContent(
														ev.content
												  )}</div>`
												: ""
										}
										${positionIndicator}
									</div>
								`;
								})
								.join("")
						: `<div style="text-align: center; padding: 40px 20px; color: #999999; font-size: 13px; font-style: italic;">No events</div>`;

				return `
					<div style="background: rgba(255, 255, 255, 0.95); border-radius: 8px; padding: 16px; min-height: 200px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); ${
						isToday ? "border: 3px solid #667eea;" : ""
					}">
						<div style="text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e0e0e0;">
							<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #667eea; margin-bottom: 4px;">
								${d.toLocaleDateString("en-US", { weekday: "short" })}
							</div>
							<div style="font-size: 28px; font-weight: 700; color: #333333;">
								${d.getDate()}
							</div>
							<div style="font-size: 11px; color: #999999; margin-top: 2px;">
								${d.toLocaleDateString("en-US", { month: "short" })}
							</div>

						</div>
						<div style="max-height: 600px; overflow-y: auto;">
							${eventsHTML}
						</div>
					</div>
				`;
			})
			.join("");

		container.innerHTML = `
			<div style="border-radius: 12px; overflow: hidden; background: rgba(255, 255, 255, 0.98); box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
				<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 24px; text-align: center;">
					<h1 style="margin: 0; font-size: 32px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px;">Weekly Schedule</h1>
					<p style="margin: 12px 0 0 0; opacity: 0.95; color: #ffffff; font-size: 16px; font-weight: 500;">
						${weekDays[0].toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							year: "numeric",
						})} - ${weekDays[6].toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		})}
					</p>
				</div>
				<div style="padding: 20px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px;">
					${dayColumns}
				</div>
			</div>
		`;

		document.body.appendChild(container);

		// Normalize all element colors before screenshot
		normalizeElementColors(container);

		// Briefly make it visible for screenshot
		container.style.opacity = "1";

		// Generate screenshot using modern-screenshot
		const blob = await domToBlob(container, {
			scale: 2,
			quality: 1,
		});

		document.body.removeChild(container);

		if (!blob) {
			throw new Error("Failed to generate screenshot blob");
		}

		return blob;
	} catch (error) {
		console.error("Screenshot generation error:", error);
		return null;
	}
};

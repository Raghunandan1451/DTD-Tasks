import React, { useEffect, useRef, useMemo } from "react";
import { TimeSlot, DateColumn } from "@src/features/event/type";

// Event interface that matches your data structure
interface RecurringEvent {
	id: string | number;
	title: string;
	content?: string;
	tag: string;
	startDate: string;
	endDate?: string;
	startTime: string;
	endTime: string;
	color: string;
	repeatType?: "none" | "daily" | "weekly" | "monthly";
	repeatLimit?: number;
	// Legacy support for the previous structure
	recurring?: {
		type: "daily" | "weekly" | "monthly";
		interval?: number;
		endDate?: string;
		daysOfWeek?: number[];
		dayOfMonth?: number;
	};
}

interface CalendarGridProps {
	events: RecurringEvent[];
	currentDate: Date;
	viewMode: "daily" | "weekly";
	onEventClick: (event: RecurringEvent) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
	events,
	currentDate,
	viewMode,
	onEventClick,
}) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Generate time slots for 24 hours
	const timeSlots: TimeSlot[] = Array.from({ length: 24 }, (_, i) => ({
		hour: i,
		label: `${i.toString().padStart(2, "0")}:00`,
	}));

	// Auto-scroll to current hour on mount and when currentDate changes
	useEffect(() => {
		if (scrollContainerRef.current) {
			const now = new Date();
			const currentHour = now.getHours();

			// Calculate the scroll position - show current hour near the top
			// Each hour slot is 60px (h-15 = 60px), offset by 2 hours above for context
			const scrollPosition = Math.max(0, (currentHour - 2) * 60);

			// Smooth scroll to the current hour
			scrollContainerRef.current.scrollTo({
				top: scrollPosition,
				behavior: "smooth",
			});
		}
	}, [currentDate, viewMode]);

	// Generate date columns based on view mode
	const getDateColumns = (): DateColumn[] => {
		const columns: DateColumn[] = [];

		if (viewMode === "daily") {
			const today = new Date();
			columns.push({
				date: currentDate,
				dateString: currentDate.toISOString().split("T")[0],
				isToday: currentDate.toDateString() === today.toDateString(),
			});
		} else {
			// Weekly view
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
	};

	const dateColumns = getDateColumns();

	// Generate recurring event instances
	const generateRecurringInstances = useMemo(() => {
		const instances: RecurringEvent[] = [];

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
				let iterationCount = 0;
				const maxIterations = 1000; // Safety limit

				while (
					currentDate <= endDate &&
					iterationCount < maxIterations &&
					occurrenceCount < maxOccurrences
				) {
					iterationCount++;
					const dateString = currentDate.toISOString().split("T")[0];

					// Check if this date is within our range
					if (currentDate >= startDate) {
						// For legacy recurring config with specific days
						if (
							type === "weekly" &&
							recurringConfig?.daysOfWeek &&
							recurringConfig.daysOfWeek.length > 0
						) {
							const dayOfWeek = currentDate.getDay();
							if (
								!recurringConfig.daysOfWeek.includes(dayOfWeek)
							) {
								currentDate.setDate(currentDate.getDate() + 1);
								continue;
							}
						}

						// For legacy recurring config with specific day of month
						if (
							type === "monthly" &&
							recurringConfig?.dayOfMonth &&
							currentDate.getDate() !== recurringConfig.dayOfMonth
						) {
							currentDate.setDate(currentDate.getDate() + 1);
							continue;
						}

						// Create instance for this date
						const instanceId = `${event.id}-${dateString}`;
						instances.push({
							...event,
							id: instanceId,
							startDate: dateString,
						});

						occurrenceCount++;

						// Stop if we've reached the repeat limit
						if (occurrenceCount >= maxOccurrences) {
							break;
						}
					}

					// Move to next occurrence
					const interval = recurringConfig?.interval || 1;
					switch (type) {
						case "daily":
							currentDate.setDate(
								currentDate.getDate() + interval
							);
							break;
						case "weekly":
							if (
								recurringConfig?.daysOfWeek &&
								recurringConfig.daysOfWeek.length > 0
							) {
								// For weekly with specific days, move to next day and let the filter handle it
								currentDate.setDate(currentDate.getDate() + 1);
							} else {
								// Standard weekly (every 7 days)
								currentDate.setDate(
									currentDate.getDate() + 7 * interval
								);
							}
							break;
						case "monthly":
							currentDate.setMonth(
								currentDate.getMonth() + interval
							);
							// Handle month overflow (e.g., Jan 31 -> Feb 28)
							if (
								recurringConfig?.dayOfMonth &&
								currentDate.getDate() !==
									recurringConfig.dayOfMonth
							) {
								currentDate.setDate(recurringConfig.dayOfMonth);
							}
							break;
					}
				}
			};

			generateInstances(baseDate, repeatType);
		});

		return instances;
	}, [events, dateColumns]);

	// Helper function to check if an event spans multiple days
	const isMultiDayEvent = (event: RecurringEvent): boolean => {
		const startHour = parseInt(event.startTime.split(":")[0]);
		const endHour = parseInt(event.endTime.split(":")[0]);
		const startMinute = parseInt(event.startTime.split(":")[1]);
		const endMinute = parseInt(event.endTime.split(":")[1]);

		const startTotalMinutes = startHour * 60 + startMinute;
		const endTotalMinutes = endHour * 60 + endMinute;

		return endTotalMinutes < startTotalMinutes;
	};

	// Helper function to get the next day's date string
	const getNextDayString = (dateString: string): string => {
		const date = new Date(dateString);
		date.setDate(date.getDate() + 1);
		return date.toISOString().split("T")[0];
	};

	// Helper function to get the previous day's date string
	const getPreviousDayString = (dateString: string): string => {
		const date = new Date(dateString);
		date.setDate(date.getDate() - 1);
		return date.toISOString().split("T")[0];
	};

	const getEventHeight = (event: RecurringEvent, columnDate: string) => {
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
		const duration =
			endHour * 60 + endMinute - (startHour * 60 + startMinute);
		return Math.max(40, (duration / 60) * 60);
	};

	const getEventTop = (event: RecurringEvent, columnDate: string) => {
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
	};

	// Get events for a specific column date
	const getEventsForColumn = (columnDate: string): RecurringEvent[] => {
		return generateRecurringInstances.filter((event) => {
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
	};

	// Get current hour for highlighting
	const currentHour = new Date().getHours();

	// Helper function to get recurring indicator text
	const getRecurringIndicator = (event: RecurringEvent): string => {
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
				baseText =
					interval === 1 ? "Monthly" : `Every ${interval} months`;
				break;
			default:
				baseText = "";
		}

		// Add repeat limit if specified
		if (repeatLimit && repeatLimit > 1) {
			baseText += ` (${repeatLimit}x)`;
		}

		return baseText;
	};

	return (
		<div className="backdrop-blur-sm rounded-bl-xl border border-gray-200/30 dark:border-gray-700/30 overflow-hidden">
			<div className="flex flex-col h-full">
				{/* Fixed Header Row */}
				<div className="flex border-b border-gray-200/30 dark:border-gray-700/30 bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm z-10">
					{/* Time axis header */}
					<div className="w-16 h-16 bg-gray-50/20 dark:bg-gray-900/20 border-r border-gray-200/30 dark:border-gray-700/30"></div>

					{/* Date headers */}
					<div className="flex-1 overflow-hidden">
						<div className="flex">
							{dateColumns.map((column) => (
								<div
									key={column.dateString}
									className="flex-1 border-r border-gray-200/30 dark:border-gray-700/30 last:border-r-0"
								>
									<div
										className={`h-16 flex flex-col items-center justify-center ${
											column.isToday
												? "bg-blue-50/30 dark:bg-blue-900/30"
												: ""
										}`}
									>
										<div className="text-sm font-medium text-gray-900/90 dark:text-white/90">
											{column.date.toLocaleDateString(
												"en-US",
												{ weekday: "short" }
											)}
										</div>
										<div
											className={`text-lg font-bold ${
												column.isToday
													? "text-blue-600/90 dark:text-blue-400/90"
													: "text-gray-900/90 dark:text-white/90"
											}`}
										>
											{column.date.getDate()}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Scrollable Content */}
				<div
					ref={scrollContainerRef}
					className="flex flex-1 overflow-y-auto scrollbar-hide"
				>
					{/* Fixed Time axis */}
					<div className="w-16 border-r border-gray-200/30 dark:border-gray-700/30">
						{timeSlots.map((slot) => (
							<div
								key={slot.hour}
								className={`h-15 border-b border-gray-200/20 dark:border-gray-700/20 flex items-start justify-center pt-1 ${
									slot.hour === currentHour
										? "bg-blue-50/40 dark:bg-blue-900/40"
										: "bg-gray-50/20 dark:bg-gray-900/20"
								}`}
							>
								<span
									className={`text-sm font-mono ${
										slot.hour === currentHour
											? "text-blue-700 dark:text-blue-300 font-semibold"
											: "text-gray-900 dark:text-gray-400/80"
									}`}
								>
									{slot.label}
								</span>
							</div>
						))}
					</div>

					{/* Scrollable Date columns */}
					<div className="flex-1">
						<div className="flex min-w-full">
							{dateColumns.map((column) => (
								<div
									key={column.dateString}
									className="flex-1 border-r border-gray-200/30 dark:border-gray-700/30 last:border-r-0"
								>
									{/* Time slots for this date */}
									<div className="relative">
										{timeSlots.map((slot) => (
											<div
												key={`${column.dateString}-${slot.hour}`}
												className={`h-15 border-b border-gray-100/20 dark:border-gray-700/20 relative ${
													slot.hour === currentHour &&
													column.isToday
														? "bg-blue-50/20 dark:bg-blue-900/20"
														: ""
												}`}
											>
												{/* Hour marker */}
												<div className="absolute inset-0 hover:bg-gray-50/20 dark:hover:bg-gray-700/20 transition-colors cursor-pointer"></div>
											</div>
										))}

										{/* Events overlay */}
										<div className="absolute inset-0 pointer-events-none">
											{getEventsForColumn(
												column.dateString
											).map((event) => {
												const top = getEventTop(
													event,
													column.dateString
												);
												const height = getEventHeight(
													event,
													column.dateString
												);

												const isEventMultiDay =
													isMultiDayEvent(event);
												const isStartDay =
													event.startDate ===
													column.dateString;
												const isEndDay =
													!isStartDay &&
													isEventMultiDay &&
													getNextDayString(
														event.startDate
													) === column.dateString;

												// Add visual indicator for multi-day events
												const borderRadius =
													isEventMultiDay
														? isStartDay
															? "rounded-l-lg rounded-tr-lg"
															: "rounded-r-lg rounded-tl-lg"
														: "rounded-lg";

												const opacity =
													isEventMultiDay && isEndDay
														? "opacity-80"
														: "opacity-100";
												const recurringIndicator =
													getRecurringIndicator(
														event
													);

												return (
													<div
														key={event.id}
														className={`absolute left-1 right-1 shadow-sm cursor-pointer pointer-events-auto hover:shadow-md transition-shadow backdrop-blur-sm ${borderRadius} ${opacity}`}
														style={{
															top: `${top}px`,
															height: `${height}px`,
															backgroundColor: `${event.color}15`,
															borderLeft: `4px solid ${event.color}90`,
															borderTop:
																event.recurring ||
																(event.repeatType &&
																	event.repeatType !==
																		"none")
																	? `2px dashed ${event.color}60`
																	: undefined,
														}}
														onClick={() =>
															onEventClick(event)
														}
													>
														<div className="p-2 h-full overflow-hidden">
															<div className="flex items-center gap-1">
																<div className="text-sm font-medium text-gray-900/90 dark:text-white/90 truncate flex-1">
																	{
																		event.title
																	}
																	{isEventMultiDay && (
																		<span className="ml-1 text-xs opacity-70">
																			{isStartDay
																				? "(cont.)"
																				: "(cont.)"}
																		</span>
																	)}
																</div>
																{(event.recurring ||
																	(event.repeatType &&
																		event.repeatType !==
																			"none")) && (
																	<div
																		className="w-2 h-2 rounded-full bg-green-500 opacity-70 flex-shrink-0"
																		title={
																			recurringIndicator
																		}
																	></div>
																)}
															</div>
															<div className="text-xs text-gray-600/80 dark:text-gray-300/80 truncate">
																{event.tag}
																{recurringIndicator && (
																	<span className="ml-1 opacity-70">
																		•{" "}
																		{
																			recurringIndicator
																		}
																	</span>
																)}
															</div>
															{height > 50 && (
																<div className="text-xs text-gray-500/70 dark:text-gray-400/70">
																	{isEventMultiDay &&
																		isStartDay &&
																		"Starts: "}
																	{isEventMultiDay &&
																		isEndDay &&
																		"Ends: "}
																	{isEventMultiDay &&
																		isStartDay &&
																		event.startTime}
																	{isEventMultiDay &&
																		isEndDay &&
																		event.endTime}
																	{!isEventMultiDay &&
																		`${event.startTime} - ${event.endTime}`}
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CalendarGrid;

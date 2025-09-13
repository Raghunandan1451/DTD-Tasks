import React, { useEffect, useRef } from "react";
import { Event, TimeSlot, DateColumn } from "@src/lib/types/event";

interface CalendarGridProps {
	events: Event[];
	currentDate: Date;
	viewMode: "daily" | "weekly";
	onEventClick: (event: Event) => void;
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

	const getEventHeight = (event: Event) => {
		const startHour = parseInt(event.startTime.split(":")[0]);
		const startMinute = parseInt(event.startTime.split(":")[1]);
		const endHour = parseInt(event.endTime.split(":")[0]);
		const endMinute = parseInt(event.endTime.split(":")[1]);

		const duration =
			endHour * 60 + endMinute - (startHour * 60 + startMinute);
		return Math.max(40, (duration / 60) * 60); // 60px per hour, minimum 40px
	};

	const getEventTop = (event: Event) => {
		const startHour = parseInt(event.startTime.split(":")[0]);
		const startMinute = parseInt(event.startTime.split(":")[1]);

		return startHour * 60 + startMinute * 1; // 60px per hour + minute offset
	};

	// Get current hour for highlighting
	const currentHour = new Date().getHours();

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
											{events
												.filter(
													(event) =>
														event.startDate ===
														column.dateString
												)
												.map((event) => {
													const top =
														getEventTop(event);
													const height =
														getEventHeight(event);

													return (
														<div
															key={`${event.id}-${column.dateString}`}
															className="absolute left-1 right-1 rounded-lg shadow-sm cursor-pointer pointer-events-auto hover:shadow-md transition-shadow backdrop-blur-sm"
															style={{
																top: `${top}px`,
																height: `${height}px`,
																backgroundColor: `${event.color}15`,
																borderLeft: `4px solid ${event.color}90`,
															}}
															onClick={() =>
																onEventClick(
																	event
																)
															}
														>
															<div className="p-2 h-full overflow-hidden">
																<div className="text-sm font-medium text-gray-900/90 dark:text-white/90 truncate">
																	{
																		event.title
																	}
																</div>
																<div className="text-xs text-gray-600/80 dark:text-gray-300/80 truncate">
																	{event.tag}
																</div>
																{height >
																	50 && (
																	<div className="text-xs text-gray-500/70 dark:text-gray-400/70">
																		{
																			event.startTime
																		}{" "}
																		-{" "}
																		{
																			event.endTime
																		}
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

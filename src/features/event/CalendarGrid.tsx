import React, { useEffect, useRef } from "react";
import { TimeSlot, CalendarGridProps } from "@src/features/event/type";
import { getDateColumns } from "@src/features/event/lib/utils";
import CalendarHeader from "@src/features/event/components/calendar/CalendarHeader";
import TimeAxis from "@src/features/event/components/calendar/TimeAxis";
import DayColumn from "@src/features/event/components/calendar/DayColumn";

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

	const dateColumns = getDateColumns(currentDate, viewMode);

	// Get current hour for highlighting
	const currentHour = new Date().getHours();

	return (
		<div className="backdrop-blur-sm rounded-bl-xl border border-gray-200/30 dark:border-gray-700/30 overflow-hidden">
			<div className="flex flex-col h-full">
				<CalendarHeader dateColumns={dateColumns} />
				<div
					ref={scrollContainerRef}
					className="flex flex-1 overflow-y-auto scrollbar-hide"
				>
					<TimeAxis timeSlots={timeSlots} currentHour={currentHour} />
					<div className="flex-1">
						<div className="flex min-w-full">
							{dateColumns.map((column) => (
								<DayColumn
									key={column.dateString}
									column={column}
									timeSlots={timeSlots}
									currentHour={currentHour}
									events={events}
									dateColumns={dateColumns}
									onEventClick={onEventClick}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CalendarGrid;

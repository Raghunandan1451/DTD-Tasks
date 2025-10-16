import { getEventsForColumn } from "@src/features/event/lib/utils";
import { DateColumn, Event, TimeSlot } from "@src/features/event/type";
import CalendarEvent from "@src/features/event/components/calendar/CalendarEvent";

const DayColumn: React.FC<{
	column: DateColumn;
	timeSlots: TimeSlot[];
	currentHour: number;
	events: Event[];
	dateColumns: DateColumn[];
	onEventClick: (event: Event, e: React.MouseEvent) => void;
}> = ({
	column,
	timeSlots,
	currentHour,
	events,
	dateColumns,
	onEventClick,
}) => {
	const handleEventClick = (event: Event, e: React.MouseEvent) => {
		e.stopPropagation();

		onEventClick(event, e);
	};

	return (
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
							slot.hour === currentHour && column.isToday
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
						column.dateString,
						events,
						dateColumns
					).map((event) => (
						<CalendarEvent
							key={event.id}
							event={event}
							columnDate={column.dateString}
							onEventClick={handleEventClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
};
export default DayColumn;

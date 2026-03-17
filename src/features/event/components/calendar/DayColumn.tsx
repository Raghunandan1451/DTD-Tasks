import { getEventsForColumn } from "@src/features/event/lib/utils";
import { DateColumn, Event } from "@src/features/event/type";
import CalendarEvent from "@src/features/event/components/calendar/CalendarEvent";

const DayColumn: React.FC<{
	column: DateColumn;
	events: Event[];
	dateColumns: DateColumn[];
	onEventClick: (event: Event, e: React.MouseEvent) => void;
}> = ({ column, events, dateColumns, onEventClick }) => {
	const handleEventClick = (event: Event, e: React.MouseEvent) => {
		e.stopPropagation();
		onEventClick(event, e);
	};

	const columnEvents = getEventsForColumn(
		column.dateString,
		events,
		dateColumns,
	);

	return (
		<div className="flex-1 border-r border-gray-200/30 dark:border-gray-700/30 last:border-r-0">
			<div
				className={`min-h-32 p-1 flex flex-col gap-1 ${
					column.isToday ? "bg-blue-50/20 dark:bg-blue-900/20" : ""
				}`}
			>
				{columnEvents.length > 0 ? (
					columnEvents.map((event) => (
						<CalendarEvent
							key={event.id}
							event={event}
							columnDate={column.dateString}
							onEventClick={handleEventClick}
						/>
					))
				) : (
					<div className="flex-1 hover:bg-gray-50/20 dark:hover:bg-gray-700/20 transition-colors cursor-pointer rounded min-h-32" />
				)}
			</div>
		</div>
	);
};

export default DayColumn;

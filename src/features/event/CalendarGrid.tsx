import React from "react";
import { CalendarGridProps } from "@src/features/event/type";
import { getDateColumns } from "@src/features/event/lib/utils";
import CalendarHeader from "@src/features/event/components/calendar/CalendarHeader";
import DayColumn from "@src/features/event/components/calendar/DayColumn";

const CalendarGrid: React.FC<CalendarGridProps> = ({
	events,
	currentDate,
	viewMode,
	onEventClick,
}) => {
	const dateColumns = getDateColumns(currentDate, viewMode);

	return (
		<div className="backdrop-blur-sm rounded-bl-xl border border-gray-200/30 dark:border-gray-700/30 overflow-hidden">
			<div className="flex flex-col h-full">
				<CalendarHeader dateColumns={dateColumns} />
				<div className="flex flex-1 overflow-y-auto scrollbar-hide">
					<div className="flex-1">
						<div className="flex min-w-full">
							{dateColumns.map((column) => (
								<DayColumn
									key={column.dateString}
									column={column}
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

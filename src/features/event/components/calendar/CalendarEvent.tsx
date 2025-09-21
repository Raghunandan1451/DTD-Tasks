import {
	getEventHeight,
	getEventTop,
	getNextDayString,
	getRecurringIndicator,
	isMultiDayEvent,
} from "@src/features/event/lib/utils";
import { Event } from "@src/features/event/type";

const CalendarEvent: React.FC<{
	event: Event;
	columnDate: string;
	onEventClick: (event: Event, e: React.MouseEvent) => void;
}> = ({ event, columnDate, onEventClick }) => {
	const top = getEventTop(event, columnDate);
	const height = getEventHeight(event, columnDate);

	const isEventMultiDay = isMultiDayEvent(event);
	const isStartDay = event.startDate === columnDate;
	const isEndDay =
		!isStartDay &&
		isEventMultiDay &&
		getNextDayString(event.startDate) === columnDate;

	// Add visual indicator for multi-day events
	const borderRadius = isEventMultiDay
		? isStartDay
			? "rounded-l-lg rounded-tr-lg"
			: "rounded-r-lg rounded-tl-lg"
		: "rounded-lg";

	const opacity = isEventMultiDay && isEndDay ? "opacity-80" : "opacity-100";
	const recurringIndicator = getRecurringIndicator(event);

	// Check if this is a recurring instance
	const isRecurringInstance =
		event.id &&
		typeof event.id === "string" &&
		event.id.includes("-") &&
		event.repeatType &&
		event.repeatType !== "none";

	return (
		<div
			key={event.id}
			className={`absolute left-1 right-1 shadow-sm cursor-pointer pointer-events-auto hover:shadow-md transition-shadow backdrop-blur-sm ${borderRadius} ${opacity} ${
				isRecurringInstance ? "border-l-2 border-l-green-400" : ""
			}`}
			style={{
				top: `${top}px`,
				height: `${height}px`,
				backgroundColor: `${event.color}15`,
				borderLeft: isRecurringInstance
					? `4px solid ${event.color}90`
					: `4px solid ${event.color}90`,
				borderTop:
					event.repeatType && event.repeatType !== "none"
						? `2px dashed ${event.color}60`
						: undefined,
			}}
			onClick={(e) => onEventClick(event, e)}
		>
			<div className="p-2 h-full overflow-hidden">
				<div className="flex items-center gap-1">
					<div className="text-sm font-medium text-gray-900/90 dark:text-white/90 truncate flex-1">
						{event.title}
						{isEventMultiDay && (
							<span className="ml-1 text-xs opacity-70">
								{isStartDay ? "(cont.)" : "(cont.)"}
							</span>
						)}
					</div>
					{event.repeatType && event.repeatType !== "none" && (
						<div
							className="w-2 h-2 rounded-full bg-green-500 opacity-70 flex-shrink-0"
							title={recurringIndicator}
						></div>
					)}
				</div>
				<div className="text-xs text-gray-600/80 dark:text-gray-300/80 truncate">
					{event.tag}
					{recurringIndicator && (
						<span className="ml-1 opacity-70">
							• {recurringIndicator}
						</span>
					)}
				</div>
				{height > 50 && (
					<div className="text-xs text-gray-500/70 dark:text-gray-400/70">
						{isEventMultiDay && isStartDay && "Starts: "}
						{isEventMultiDay && isEndDay && "Ends: "}
						{isEventMultiDay && isStartDay && event.startTime}
						{isEventMultiDay && isEndDay && event.endTime}
						{!isEventMultiDay &&
							`${event.startTime} - ${event.endTime}`}
					</div>
				)}
			</div>
		</div>
	);
};
export default CalendarEvent;

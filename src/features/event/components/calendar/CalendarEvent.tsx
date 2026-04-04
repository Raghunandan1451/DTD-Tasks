import { getRecurringIndicator } from "@src/features/event/lib/utils";
import { Event } from "@src/features/event/type";

const CalendarEvent: React.FC<{
	event: Event;
	columnDate: string;
	onEventClick: (event: Event, e: React.MouseEvent) => void;
}> = ({ event, columnDate, onEventClick }) => {
	const isMultiDay = event.startDate !== event.endDate;
	const isStartDay = event.startDate === columnDate;
	const isEndDay = event.endDate === columnDate;

	const borderRadius = isMultiDay
		? isStartDay
			? "rounded-l-lg rounded-tr-lg"
			: "rounded-r-lg rounded-tl-lg"
		: "rounded-lg";

	const opacity = isMultiDay && isEndDay ? "opacity-80" : "opacity-100";
	const recurringIndicator = getRecurringIndicator(event);

	const isRecurringInstance =
		event.id &&
		typeof event.id === "string" &&
		event.id.includes("-") &&
		event.repeatType !== "none";

	return (
		<div
			key={event.id}
			className={`relative min-w-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow backdrop-blur-sm ${borderRadius} ${opacity} ${
				isRecurringInstance ? "border-l-2 border-l-green-400" : ""
			}`}
			style={{
				backgroundColor: `${event.color}15`,
				borderLeft: `4px solid ${event.color}90`,
				borderTop:
					event.repeatType && event.repeatType !== "none"
						? `2px dashed ${event.color}60`
						: undefined,
			}}
			onClick={(e) => onEventClick(event, e)}
		>
			<div className="p-2 overflow-hidden">
				<div className="flex items-center gap-1">
					<div className="text-sm font-medium text-gray-900/90 dark:text-white/90 truncate flex-1">
						{event.title}
						{isMultiDay && (
							<span className="ml-1 text-xs opacity-70">
								{isStartDay ? "→" : isEndDay ? "←" : "↔"}
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
			</div>
		</div>
	);
};

export default CalendarEvent;

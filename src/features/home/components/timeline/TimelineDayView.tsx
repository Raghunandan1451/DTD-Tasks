import React from "react";
import TimelineEntryRow from "@src/features/home/components/timeline/TimelineEntryRow";
import type { DayRow } from "@src/features/home/lib/timelineLayout";

interface TimelineDayViewProps {
	row: DayRow;
}

const TimelineDayView: React.FC<TimelineDayViewProps> = ({ row }) => (
	<li className="tl-day tl-enter mb-1">
		<div className="tl-day-head">
			<span
				aria-hidden="true"
				className={`tl-node ${row.isToday ? "tl-node--today" : ""}`}
			/>
			<h2 className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-gray-800 dark:text-gray-200">
				<time dateTime={row.day}>{row.label}</time>
				<span className="text-xs font-normal text-gray-600 dark:text-gray-400">
					{row.count} {row.count === 1 ? "activity" : "activities"}
				</span>
			</h2>
		</div>
		<ul className="tl-day-list">
			{row.entries.map((entry) => {
				const classes = `tl-row tl-row--${entry.type}`;
				return (
					<li key={entry.key} className={classes}>
						<TimelineEntryRow entry={entry} />
					</li>
				);
			})}
		</ul>
	</li>
);

export default TimelineDayView;

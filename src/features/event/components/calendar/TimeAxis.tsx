import { TimeSlot } from "@src/features/event/type";

const TimeAxis: React.FC<{ timeSlots: TimeSlot[]; currentHour: number }> = ({
	timeSlots,
	currentHour,
}) => (
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
);
export default TimeAxis;

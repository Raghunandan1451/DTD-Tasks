import { DateColumn } from "@src/features/event/type";

const CalendarHeader: React.FC<{ dateColumns: DateColumn[] }> = ({
	dateColumns,
}) => (
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
								{column.date.toLocaleDateString("en-US", {
									weekday: "short",
								})}
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
);
export default CalendarHeader;

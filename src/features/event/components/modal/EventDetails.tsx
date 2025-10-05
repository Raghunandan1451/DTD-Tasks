import React from "react";
import { Tag, Calendar, Clock, RefreshCw } from "lucide-react";
import { Event } from "@src/features/event/type";
import { TAGS } from "@src/features/event/constants";
import Input from "@src/components/ui/input/Input";

interface EventDetailsProps {
	event: Event;
	editData: Event;
	isEditing: boolean;
	isRecurringInstance: boolean;
	actualBaseEvent?: Event;
	onTagChange: (tagName: string) => void;
	onDateTimeChange: (field: string, value: string) => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({
	event,
	editData,
	isEditing,
	isRecurringInstance,
	actualBaseEvent,
	onTagChange,
	onDateTimeChange,
}) => (
	<div className="space-y-4">
		{/* Tag and Color */}
		<div className="flex items-center gap-4">
			<div className="flex items-center gap-2">
				<Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
				{isEditing ? (
					<select
						value={editData.tag}
						onChange={(e) => onTagChange(e.target.value)}
						className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
					>
						{TAGS.map((tag) => (
							<option
								key={tag.name}
								value={tag.name}
								className="bg-gray-800"
							>
								{tag.name}
							</option>
						))}
					</select>
				) : (
					<span
						className="px-2 py-1 rounded-full text-sm text-white"
						style={{ backgroundColor: event.color }}
					>
						{event.tag}
					</span>
				)}
			</div>
		</div>

		{/* Recurring Info */}
		{!isEditing && isRecurringInstance && actualBaseEvent && (
			<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
				<div className="flex items-center gap-2 text-green-700 dark:text-green-300">
					<RefreshCw className="w-4 h-4" />
					<span className="font-medium">Recurring Pattern</span>
				</div>
				<div className="text-sm text-green-600 dark:text-green-400 mt-1">
					{actualBaseEvent.repeatType === "daily" &&
						`Repeats daily${
							actualBaseEvent.repeatLimit
								? ` (${actualBaseEvent.repeatLimit} times)`
								: ""
						}`}
					{actualBaseEvent.repeatType === "weekly" &&
						`Repeats weekly${
							actualBaseEvent.repeatLimit
								? ` (${actualBaseEvent.repeatLimit} times)`
								: ""
						}`}
					{actualBaseEvent.repeatType === "monthly" &&
						`Repeats monthly${
							actualBaseEvent.repeatLimit
								? ` (${actualBaseEvent.repeatLimit} times)`
								: ""
						}`}
				</div>
			</div>
		)}

		{/* Date and Time */}
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div className="flex items-center gap-2">
				<Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
				{isEditing ? (
					<div className="space-y-1">
						<Input
							id="startDate"
							type="date"
							value={editData.startDate}
							onChange={(e) =>
								onDateTimeChange("startDate", e.target.value)
							}
							className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
						/>
						{editData.startDate !== editData.endDate && (
							<Input
								id="endDate"
								type="date"
								value={editData.endDate}
								onChange={(e) =>
									onDateTimeChange("endDate", e.target.value)
								}
								className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
							/>
						)}
					</div>
				) : (
					<span className="text-gray-600 dark:text-gray-300">
						{new Date(event.startDate).toLocaleDateString("en-US", {
							weekday: "long",
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</span>
				)}
			</div>

			<div className="flex items-center gap-2">
				<Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
				{isEditing ? (
					<div className="flex gap-2">
						<Input
							id="startTime"
							type="time"
							value={editData.startTime}
							onChange={(e) =>
								onDateTimeChange("startTime", e.target.value)
							}
							className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
						/>
						<span className="text-gray-500">-</span>
						<Input
							id="endTime"
							type="time"
							value={editData.endTime}
							onChange={(e) =>
								onDateTimeChange("endTime", e.target.value)
							}
							className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
						/>
					</div>
				) : (
					<span className="text-gray-600 dark:text-gray-300">
						{event.startTime} - {event.endTime}
					</span>
				)}
			</div>
		</div>
	</div>
);

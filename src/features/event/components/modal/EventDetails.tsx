import React from "react";
import { Tag, Calendar, RefreshCw } from "lucide-react";
import { Event } from "@src/features/event/type";
import { TAGS, REPEAT_OPTIONS } from "@src/features/event/constants";
import Input from "@src/components/ui/input/Input";

interface EventDetailsProps {
	event: Event;
	editData: Event;
	isEditing: boolean;
	isRecurringInstance: boolean;
	actualBaseEvent?: Event;
	onTagChange: (tagName: string) => void;
	onDateTimeChange: (field: string, value: string) => void;
	onRepeatChange: (
		field: "repeatType" | "repeatLimit",
		value: string | number,
	) => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({
	event,
	editData,
	isEditing,
	isRecurringInstance,
	actualBaseEvent,
	onTagChange,
	onDateTimeChange,
	onRepeatChange,
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

		{isEditing && (
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Repeat
					<select
						value={editData.repeatType}
						onChange={(e) =>
							onRepeatChange("repeatType", e.target.value)
						}
						className="mt-1 w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
					>
						{REPEAT_OPTIONS.map((option) => (
							<option
								key={option.value}
								value={option.value}
								className="bg-gray-800"
							>
								{option.label}
							</option>
						))}
					</select>
				</label>
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Repeat Limit
					<Input
						id="repeatLimit"
						type="number"
						min="1"
						value={editData.repeatLimit}
						disabled={editData.repeatType === "none"}
						onChange={(e) =>
							onRepeatChange(
								"repeatLimit",
								parseInt(e.target.value, 10) || 0,
							)
						}
						className="number-input-noappearance mt-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white disabled:opacity-50"
					/>
				</label>
			</div>
		)}

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

		{/* Date */}
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
					{event.startDate !== event.endDate && (
						<>
							{" — "}
							{new Date(event.endDate).toLocaleDateString(
								"en-US",
								{
									weekday: "long",
									year: "numeric",
									month: "long",
									day: "numeric",
								},
							)}
						</>
					)}
				</span>
			)}
		</div>
	</div>
);

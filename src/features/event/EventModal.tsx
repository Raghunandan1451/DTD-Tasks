import React, { useState, useRef, useEffect } from "react";
import {
	X,
	Edit2,
	Trash2,
	Save,
	Clock,
	Tag,
	Calendar,
	RefreshCw,
} from "lucide-react";
import { Event } from "@src/features/event/type";
import { TAGS } from "@src/features/event/constants";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";
import { getBaseEventId } from "@src/features/event/lib/utils";

interface EventModalProps {
	event: Event;
	onUpdate: (event: Event, editType?: "single" | "all") => void;
	onDelete: (eventId: string | number, deleteType?: "single" | "all") => void;
	onClose: () => void;
	// New props for recurring events
	baseEvent?: Event; // The original event for recurring instances
	allEvents?: Event[]; // All events to find the base event if needed
}

const EventModal: React.FC<EventModalProps> = ({
	event,
	onUpdate,
	onDelete,
	onClose,
	baseEvent,
	allEvents = [],
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState(event);
	const [showRecurringOptions, setShowRecurringOptions] = useState(false);
	const [pendingAction, setPendingAction] = useState<
		"edit" | "delete" | null
	>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Check if this is a recurring event instance
	const isRecurringInstance =
		event.id &&
		typeof event.id === "string" &&
		event.id.includes("-") &&
		event.repeatType &&
		event.repeatType !== "none";

	// Get base event if this is a recurring instance
	const actualBaseEvent =
		baseEvent ||
		(isRecurringInstance && allEvents
			? allEvents.find((e) => e.id === getBaseEventId(event.id as string))
			: undefined);

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current && isEditing) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height =
				textareaRef.current.scrollHeight + "px";
		}
	}, [editData.content, isEditing]);

	const handleSave = () => {
		if (isRecurringInstance && !showRecurringOptions) {
			setPendingAction("edit");
			setShowRecurringOptions(true);
			return;
		}

		onUpdate(editData);
		setIsEditing(false);
		setShowRecurringOptions(false);
		setPendingAction(null);
	};

	const handleDelete = () => {
		if (isRecurringInstance && !showRecurringOptions) {
			setPendingAction("delete");
			setShowRecurringOptions(true);
			return;
		}

		if (confirm("Are you sure you want to delete this event?")) {
			onDelete(event.id as number);
			setShowRecurringOptions(false);
			setPendingAction(null);
		}
	};

	const handleRecurringAction = (actionType: "single" | "all") => {
		if (pendingAction === "edit") {
			onUpdate(editData, actionType);
			setIsEditing(false);
		} else if (pendingAction === "delete") {
			if (
				confirm(
					`Are you sure you want to delete ${
						actionType === "single"
							? "this occurrence"
							: "all occurrences"
					} of this event?`
				)
			) {
				if (actionType === "single") {
					onDelete(event.id as string, "single");
				} else {
					const baseEventId =
						actualBaseEvent?.id ||
						getBaseEventId(event.id as string);
					onDelete(baseEventId, "all");
				}
			}
		}

		setShowRecurringOptions(false);
		setPendingAction(null);
	};

	const handleCancel = () => {
		setEditData(event);
		setIsEditing(false);
		setShowRecurringOptions(false);
		setPendingAction(null);
	};

	const handleTagChange = (tagName: string) => {
		const tag = TAGS.find((t) => t.name === tagName);
		setEditData({
			...editData,
			tag: tagName,
			color: tag?.color || "#6b7280",
		});
	};

	// Recurring Options Modal
	const RecurringOptionsModal = () => (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-60">
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
				<div className="flex items-center gap-3 mb-4">
					<RefreshCw className="w-5 h-5 text-blue-500" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Recurring Event
					</h3>
				</div>

				<p className="text-gray-600 dark:text-gray-300 mb-6">
					This is a recurring event. What would you like to{" "}
					{pendingAction}?
				</p>

				<div className="space-y-3">
					<button
						onClick={() => handleRecurringAction("single")}
						className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						<div className="font-medium text-gray-900 dark:text-white">
							Only this occurrence
						</div>
						<div className="text-sm text-gray-500 dark:text-gray-400">
							{pendingAction === "edit" ? "Edit" : "Delete"} just
							this single event on{" "}
							{new Date(event.startDate).toLocaleDateString()}
						</div>
					</button>

					<button
						onClick={() => handleRecurringAction("all")}
						className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						<div className="font-medium text-gray-900 dark:text-white">
							All occurrences
						</div>
						<div className="text-sm text-gray-500 dark:text-gray-400">
							{pendingAction === "edit" ? "Edit" : "Delete"} the
							entire recurring event series
						</div>
					</button>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<button
						onClick={() => {
							setShowRecurringOptions(false);
							setPendingAction(null);
						}}
						className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);

	return (
		<>
			<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
				<div className="bg-gray-50/40 dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
						<div className="flex-1 flex items-center gap-3">
							{isRecurringInstance && (
								<RefreshCw className="w-5 h-5 text-green-500 flex-shrink-0" />
							)}
							{isEditing ? (
								<input
									type="text"
									value={editData.title}
									onChange={(e) =>
										setEditData({
											...editData,
											title: e.target.value,
										})
									}
									className="text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white w-full"
								/>
							) : (
								<div className="flex-1">
									<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
										{event.title}
									</h2>
									{isRecurringInstance && (
										<p className="text-sm text-green-600 dark:text-green-400">
											Recurring Event •{" "}
											{new Date(
												event.startDate
											).toLocaleDateString()}
										</p>
									)}
								</div>
							)}
						</div>
						<div className="flex items-center gap-2 ml-4">
							{isEditing ? (
								<>
									<button
										onClick={handleSave}
										className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
									>
										<Save className="w-5 h-5" />
									</button>
									<button
										onClick={handleCancel}
										className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
									>
										<X className="w-5 h-5" />
									</button>
								</>
							) : (
								<>
									<button
										onClick={() => setIsEditing(true)}
										className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
									>
										<Edit2 className="w-5 h-5" />
									</button>
									<button
										onClick={handleDelete}
										className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
									>
										<Trash2 className="w-5 h-5" />
									</button>
									<button
										onClick={onClose}
										className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
									>
										<X className="w-5 h-5" />
									</button>
								</>
							)}
						</div>
					</div>

					{/* Event Details */}
					<div className="p-6 space-y-4">
						{/* Tag and Color */}
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
								{isEditing ? (
									<select
										value={editData.tag}
										onChange={(e) =>
											handleTagChange(e.target.value)
										}
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
						{!isEditing &&
							isRecurringInstance &&
							actualBaseEvent && (
								<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
									<div className="flex items-center gap-2 text-green-700 dark:text-green-300">
										<RefreshCw className="w-4 h-4" />
										<span className="font-medium">
											Recurring Pattern
										</span>
									</div>
									<div className="text-sm text-green-600 dark:text-green-400 mt-1">
										{actualBaseEvent.repeatType ===
											"daily" &&
											`Repeats daily${
												actualBaseEvent.repeatLimit
													? ` (${actualBaseEvent.repeatLimit} times)`
													: ""
											}`}
										{actualBaseEvent.repeatType ===
											"weekly" &&
											`Repeats weekly${
												actualBaseEvent.repeatLimit
													? ` (${actualBaseEvent.repeatLimit} times)`
													: ""
											}`}
										{actualBaseEvent.repeatType ===
											"monthly" &&
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
										<input
											type="date"
											value={editData.startDate}
											onChange={(e) =>
												setEditData({
													...editData,
													startDate: e.target.value,
												})
											}
											className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
										/>
										{editData.startDate !==
											editData.endDate && (
											<input
												type="date"
												value={editData.endDate}
												onChange={(e) =>
													setEditData({
														...editData,
														endDate: e.target.value,
													})
												}
												className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
											/>
										)}
									</div>
								) : (
									<span className="text-gray-600 dark:text-gray-300">
										{new Date(
											event.startDate
										).toLocaleDateString("en-US", {
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
										<input
											type="time"
											value={editData.startTime}
											onChange={(e) =>
												setEditData({
													...editData,
													startTime: e.target.value,
												})
											}
											className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
										/>
										<span className="text-gray-500">-</span>
										<input
											type="time"
											value={editData.endTime}
											onChange={(e) =>
												setEditData({
													...editData,
													endTime: e.target.value,
												})
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

						{/* Content */}
						<div className="mt-4">
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
								Content
							</h3>
							{isEditing ? (
								<div className="space-y-3">
									<textarea
										ref={textareaRef}
										value={editData.content}
										onChange={(e) =>
											setEditData({
												...editData,
												content: e.target.value,
											})
										}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50/20 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px] resize-none"
									/>
									<div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
										<div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
											Preview:
										</div>
										<div className="text-gray-900 dark:text-white">
											{parseMarkdown(editData.content)}
										</div>
									</div>
								</div>
							) : (
								<div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
									<div className="text-gray-900 dark:text-white">
										{parseMarkdown(event.content)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Recurring Options Modal */}
			{showRecurringOptions && <RecurringOptionsModal />}
		</>
	);
};

export default EventModal;

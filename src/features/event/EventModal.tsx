import React, { useState, useRef, useEffect } from "react";
import { X, Edit2, Trash2, Save, Clock, Tag, Calendar } from "lucide-react";
import { Event, TAGS } from "@src/features/event/type";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";

interface EventModalProps {
	event: Event;
	onUpdate: (event: Event) => void;
	onDelete: (id: number) => void;
	onClose: () => void;
}

const EventModal: React.FC<EventModalProps> = ({
	event,
	onUpdate,
	onDelete,
	onClose,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState(event);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current && isEditing) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height =
				textareaRef.current.scrollHeight + "px";
		}
	}, [editData.content, isEditing]);

	const handleSave = () => {
		onUpdate(editData);
		setIsEditing(false);
	};

	const handleCancel = () => {
		setEditData(event);
		setIsEditing(false);
	};

	const handleTagChange = (tagName: string) => {
		const tag = TAGS.find((t) => t.name === tagName);
		setEditData({
			...editData,
			tag: tagName,
			color: tag?.color || "#6b7280",
		});
	};

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
			<div className="bg-gray-50/40 dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex-1">
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
							<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
								{event.title}
							</h2>
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
									onClick={() => {
										if (
											confirm(
												"Are you sure you want to delete this event?"
											)
										) {
											onDelete(event.id as number);
										}
									}}
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
	);
};

export default EventModal;

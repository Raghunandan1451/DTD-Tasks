import React, { useState } from "react";
import { X, Clock, Tag, Calendar, Repeat } from "lucide-react";
import {
	Event,
	RepeatType,
	TAGS,
	REPEAT_OPTIONS,
} from "@src/features/event/type";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import SimpleSelect from "@src/components/ui/select_dropdown/SimpleSelect";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";

interface EventFormProps {
	onSave: (event: Omit<Event, "id">) => void;
	onCancel: () => void;
}

type FormData = {
	title: string;
	content: string;
	tag: string;
	startDate: string;
	endDate: string;
	startTime: string;
	endTime: string;
	color: string;
	repeatType: RepeatType;
	repeatLimit: number;
};

interface FormField {
	id: string;
	label: string;
	type: "text" | "date" | "time" | "select" | "number";
	key: keyof FormData;
	icon?: React.ReactNode;
	placeholder?: string;
	options?: string[];
	min?: string;
	max?: string;
	span: number;
	row: number;
	disabled?: (formData: FormData) => boolean;
	onChange?: (
		value: string | number,
		formData: FormData
	) => Partial<FormData>;
}

// Helper functions
const pad = (n: number) => n.toString().padStart(2, "0");

// Defaults
const todayISO = new Date().toISOString().split("T")[0];
const now = new Date();
const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
const later = new Date(now.getTime() + 30 * 60000);
const laterTime = `${pad(later.getHours())}:${pad(later.getMinutes())}`;

// Common field styling classes
const COMMON_INPUT_STYLES =
	"rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const EventForm: React.FC<EventFormProps> = ({ onSave, onCancel }) => {
	const { notifications, showNotification } = useNotifications();

	const [formData, setFormData] = useState<FormData>({
		title: "",
		content: "",
		tag: TAGS[0].name,
		startDate: todayISO,
		endDate: todayISO,
		startTime: currentTime,
		endTime: laterTime,
		color: TAGS[0].color,
		repeatType: "none",
		repeatLimit: 12,
	});

	// Form field definitions
	const formFields: FormField[] = [
		// Row 1
		{
			id: "title",
			label: "Event Title",
			type: "text",
			key: "title",
			placeholder: "Enter event title",
			span: 5,
			row: 1,
		},
		{
			id: "tag",
			label: "Tag",
			type: "select",
			key: "tag",
			icon: <Tag className="w-4 h-4 inline mr-1" />,
			options: TAGS.map((t) => t.name),
			span: 3,
			row: 1,
			onChange: (value) => {
				const tagName = value as string;
				const tag = TAGS.find((t) => t.name === tagName);
				return { tag: tagName, color: tag?.color || "#6b7280" };
			},
		},
		{
			id: "repeat",
			label: "Repeat",
			type: "select",
			key: "repeatType",
			icon: <Repeat className="w-4 h-4 inline mr-1" />,
			options: REPEAT_OPTIONS.map((r) => r.value),
			span: 2,
			row: 1,
		},
		{
			id: "repeatLimit",
			label: "Repeat Limit",
			type: "number",
			key: "repeatLimit",
			min: "1",
			max: "52",
			span: 2,
			row: 1,
			disabled: (formData) => formData.repeatType === "none",
		},
		// Row 2
		{
			id: "startDate",
			label: "Start Date",
			type: "date",
			key: "startDate",
			icon: <Calendar className="w-4 h-4 inline mr-1" />,
			min: todayISO,
			span: 1,
			row: 2,
		},
		{
			id: "startTime",
			label: "Start Time",
			type: "time",
			key: "startTime",
			icon: <Clock className="w-4 h-4 inline mr-1" />,
			span: 1,
			row: 2,
			onChange: (value, formData) => {
				const start = new Date(`${formData.startDate}T${value}`);
				const end = new Date(`${formData.endDate}T${formData.endTime}`);
				const updates: Partial<FormData> = {
					startTime: value as string,
				};

				if (!formData.endTime || end <= start) {
					const autoEnd = new Date(start.getTime() + 30 * 60000);
					updates.endTime = `${pad(autoEnd.getHours())}:${pad(
						autoEnd.getMinutes()
					)}`;
				}
				return updates;
			},
		},
		{
			id: "endDate",
			label: "End Date",
			type: "date",
			key: "endDate",
			span: 1,
			row: 2,
		},
		{
			id: "endTime",
			label: "End Time",
			type: "time",
			key: "endTime",
			span: 1,
			row: 2,
		},
	];

	const handleFieldChange = (field: FormField, value: string | number) => {
		let updates: Partial<FormData> = { [field.key]: value };

		// Handle custom onChange logic
		if (field.onChange) {
			updates = { ...updates, ...field.onChange(value, formData) };
		}

		// Auto-adjust end date when start date changes
		if (field.key === "startDate") {
			const startDate = new Date(value as string);
			const endDate = new Date(formData.endDate);
			if (endDate < startDate) {
				updates.endDate = value as string;
			}
		}

		setFormData((prev) => ({ ...prev, ...updates }));
	};

	const handleSubmit = () => {
		const start = new Date(`${formData.startDate}T${formData.startTime}`);
		const end = new Date(`${formData.endDate}T${formData.endTime}`);

		// Validation
		if (!formData.title.trim() || !formData.content.trim()) {
			showNotification("Please fill in both title and content.", "error");
			return;
		}

		if (end <= start) {
			showNotification("End time must be after start time.", "error");
			return;
		}

		onSave(formData);
		showNotification(
			`Event "${formData.title}" created successfully!`,
			"success"
		);
	};

	const renderField = (field: FormField) => {
		const isDisabled = field.disabled && field.disabled(formData);
		const fieldValue = formData[field.key];

		// Dynamic min value for date fields
		const minValue =
			field.key === "endDate" ? formData.startDate : field.min;

		const fieldClasses = `col-span-${field.span} ${
			isDisabled ? "opacity-30" : "opacity-100"
		} transition-opacity duration-200`;

		return (
			<div key={field.id} className={fieldClasses}>
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					{field.icon}
					{field.label}
				</label>

				{field.type === "select" ? (
					<SimpleSelect
						id={field.id}
						value={fieldValue as string}
						onChange={(e) =>
							handleFieldChange(field, e.target.value)
						}
						options={field.options || []}
						className={COMMON_INPUT_STYLES}
					/>
				) : (
					<Input
						id={field.id}
						type={field.type}
						value={fieldValue as string | number}
						onChange={(e) =>
							handleFieldChange(
								field,
								field.type === "number"
									? parseInt(e.target.value) || 0
									: e.target.value
							)
						}
						className={COMMON_INPUT_STYLES}
						placeholder={field.placeholder}
						min={minValue}
						max={field.max}
						disabled={isDisabled}
					/>
				)}
			</div>
		);
	};

	const MarkdownPreview = () => (
		<div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 min-h-[150px] bg-gray-50 dark:bg-gray-700/50 overflow-auto">
			<div className="text-gray-900 dark:text-white">
				{parseMarkdown(
					formData.content || "Start typing to see preview..."
				)}
			</div>
		</div>
	);

	// Group fields by row
	const row1Fields = formFields.filter((field) => field.row === 1);
	const row2Fields = formFields.filter((field) => field.row === 2);

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
			<div className="bg-gray-50/20 dark:bg-gray-800/60 rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
				{/* Header */}
				<div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						Create New Event
					</h2>
					<Button
						onClick={onCancel}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
					>
						<X className="w-6 h-6" />
					</Button>
				</div>

				{/* Form Content */}
				<div className="p-4">
					{/* Row 1: Title, Tag, Repeat, Repeat Limit */}
					<div className="grid grid-cols-12 gap-3 mb-4">
						{row1Fields.map(renderField)}
					</div>

					{/* Row 2: Start Date/Time, End Date/Time */}
					<div className="grid grid-cols-4 gap-3 mb-4">
						{row2Fields.map(renderField)}
					</div>

					{/* Content Editor with Live Preview */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Content (Markdown supported)
						</label>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
							{/* Editor */}
							<div>
								<textarea
									className="outline-none resize-none w-full text-gray-900 dark:text-gray-100 placeholder-gray-700 dark:placeholder-gray-500 p-2 scrollbar-hide border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50/20 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
									value={formData.content}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											content: e.target.value,
										}))
									}
									placeholder="Enter your content here... Use **bold**, *italic*, # headers, - lists"
								/>
								<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Supports: **bold** *italic* # Headers -
									Lists `code` [links](url)
								</div>
							</div>

							{/* Live Preview */}
							<MarkdownPreview />
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
					<Button
						onClick={onCancel}
						className="px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
					>
						Add Event
					</Button>
				</div>

				<NotificationCenter notifications={notifications} />
			</div>
		</div>
	);
};

export default EventForm;

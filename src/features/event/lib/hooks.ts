import { useState, useMemo } from "react";
import {
	// DateColumn,
	// Event,
	EventFormData,
	FormField,
	UseEventModalProps,
	ValidationErrors,
	ValidationRules,
} from "@src/features/event/type";
import { TAGS, REPEAT_OPTIONS } from "@src/features/event/constants";
import {
	validateForm,
	getBaseEventId,
	pad,
} from "@src/features/event/lib/utils";

const todayISO = new Date().toISOString().split("T")[0];

export const useFormConfig = () => {
	const formFields: FormField[] = useMemo(
		() => [
			// Row 1
			{
				id: "title",
				label: "Event Title",
				type: "text",
				key: "title",
				placeholder: "Enter event title",
				span: 2,
				row: 1,
			},
			{
				id: "tag",
				label: "Tag",
				type: "select",
				key: "tag",
				iconName: "tag",
				options: TAGS.map((t) => t.name),
				span: 1,
				row: 1,
				onChange: (value: string | number): Partial<EventFormData> => {
					const tagName = value as string;
					const tag = TAGS.find((t) => t.name === tagName);
					return {
						tag: tagName,
						color: tag?.color || "#6b7280",
					};
				},
			},
			{
				id: "repeat",
				label: "Repeat",
				type: "select",
				key: "repeatType",
				iconName: "repeat",
				options: REPEAT_OPTIONS.map((r) => r.value),
				span: 1,
				row: 1,
			},
			{
				id: "repeatLimit",
				label: "Repeat Limit",
				type: "number",
				key: "repeatLimit",
				min: "1",
				max: "52",
				span: 1,
				row: 1,
				disabled: (formData: EventFormData) =>
					formData.repeatType === "none",
			},
			// Row 2
			{
				id: "startDate",
				label: "Start Date",
				type: "date",
				key: "startDate",
				iconName: "calendar",
				min: todayISO,
				span: 1,
				row: 2,
			},
			{
				id: "startTime",
				label: "Start Time",
				type: "time",
				key: "startTime",
				iconName: "clock",
				span: 1,
				row: 2,
				onChange: (
					value: string | number,
					formData: EventFormData
				): Partial<EventFormData> => {
					const timeValue = value as string;
					const start = new Date(
						`${formData.startDate}T${timeValue}`
					);
					const end = new Date(
						`${formData.endDate}T${formData.endTime}`
					);

					const updates: Partial<EventFormData> = {
						startTime: timeValue,
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
		],
		[]
	);

	return { formFields };
};

export const useEventModal = ({
	event,
	onUpdate,
	onDelete,
	allEvents = [],
}: Omit<UseEventModalProps, "baseEvent">) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState(event);
	const [showRecurringOptions, setShowRecurringOptions] = useState(false);
	const [pendingAction, setPendingAction] = useState<
		"edit" | "delete" | null
	>(null);

	// FIXED: Check if this is a recurring instance by looking at ID format
	// and finding the base event
	const isRecurringInstanceId =
		typeof event.id === "string" && event.id.includes("-");

	// Get base event ID from instance ID
	const baseEventId = isRecurringInstanceId
		? getBaseEventId(event.id as string)
		: event.id;

	// Find the actual base event from Redux store
	const actualBaseEvent = isRecurringInstanceId
		? allEvents.find((e) => {
				const numericId =
					typeof baseEventId === "string"
						? parseInt(baseEventId, 10)
						: baseEventId;
				return e.id === numericId;
		  })
		: undefined;

	// This is a recurring instance if we found a base event with repeatType
	const isRecurringInstance =
		isRecurringInstanceId &&
		actualBaseEvent &&
		actualBaseEvent.repeatType &&
		actualBaseEvent.repeatType !== "none";

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
			onDelete(event.id);
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
					// For single deletion, pass the instance ID
					onDelete(event.id, "single");
				} else {
					// For all deletions, pass the base event ID
					const numericBaseId =
						typeof baseEventId === "string"
							? parseInt(baseEventId, 10)
							: baseEventId;
					onDelete(numericBaseId, "all");
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

	const handleDateTimeChange = (field: string, value: string) => {
		setEditData({
			...editData,
			[field]: value,
		});
	};

	const handleTitleChange = (title: string) => {
		setEditData({
			...editData,
			title,
		});
	};

	const handleContentChange = (content: string) => {
		setEditData({
			...editData,
			content,
		});
	};

	return {
		isEditing,
		editData,
		showRecurringOptions,
		pendingAction,
		isRecurringInstance,
		actualBaseEvent,
		setIsEditing,
		handleSave,
		handleDelete,
		handleRecurringAction,
		handleCancel,
		handleTagChange,
		handleDateTimeChange,
		handleTitleChange,
		handleContentChange,
	};
};

export const useFormValidation = <T extends Record<string, unknown>>(
	data: T,
	rules: ValidationRules
) => {
	const [errors, setErrors] = useState<ValidationErrors>({});

	const isValid = useMemo(() => {
		const currentErrors = validateForm(data, rules);
		return Object.keys(currentErrors).length === 0;
	}, [data, rules]);

	const validate = () => {
		const currentErrors = validateForm(data, rules);
		setErrors(currentErrors);
		return Object.keys(currentErrors).length === 0;
	};

	const clearErrors = () => setErrors({});

	return {
		errors,
		isValid,
		validate,
		clearErrors,
		setErrors,
	};
};

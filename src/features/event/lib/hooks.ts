import { useState, useMemo } from "react";
import {
	EventFormData,
	FormField,
	UseEventModalProps,
	ValidationErrors,
	ValidationRules,
} from "@src/features/event/type";
import { TAGS, REPEAT_OPTIONS } from "@src/features/event/constants";
import { validateForm, getBaseEventId } from "@src/features/event/lib/utils";
import { useConfirmationModal } from "@src/lib/hooks/useConfirmDialog";

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
				id: "endDate",
				label: "End Date",
				type: "date",
				key: "endDate",
				iconName: "calendar",
				span: 1,
				row: 2,
			},
		],
		[],
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

	const confirmationModal = useConfirmationModal();

	const isRecurringInstanceId =
		typeof event.id === "string" && event.id.includes("-");

	const baseEventId = isRecurringInstanceId
		? getBaseEventId(event.id as string)
		: event.id;

	const actualBaseEvent = isRecurringInstanceId
		? allEvents.find((e) => {
				const numericId =
					typeof baseEventId === "string"
						? parseInt(baseEventId, 10)
						: baseEventId;
				return e.id === numericId;
			})
		: undefined;

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

	const handleDelete = async () => {
		if (isRecurringInstance && !showRecurringOptions) {
			setPendingAction("delete");
			setShowRecurringOptions(true);
			return;
		}

		const confirmed = await confirmationModal.confirm({
			title: "Delete Event",
			message: "Are you sure you want to delete this event?",
			itemName: event.title,
			confirmText: "Delete",
			cancelText: "Cancel",
			type: "danger",
		});

		if (confirmed) {
			onDelete(event.id);
			setShowRecurringOptions(false);
			setPendingAction(null);
		}
	};

	const handleRecurringAction = async (actionType: "single" | "all") => {
		// Hide RecurringOptionsModal immediately on selection
		setShowRecurringOptions(false);

		if (pendingAction === "edit") {
			onUpdate(editData, actionType);
			setIsEditing(false);
			setPendingAction(null);
		} else if (pendingAction === "delete") {
			const confirmed = await confirmationModal.confirm({
				title: "Delete Recurring Event",
				message: `Are you sure you want to delete ${
					actionType === "single"
						? "this occurrence"
						: "all occurrences"
				} of this event?`,
				itemName: event.title,
				confirmText: "Delete",
				cancelText: "Cancel",
				type: "danger",
			});

			if (confirmed) {
				if (actionType === "single") {
					onDelete(event.id, "single");
				} else {
					const numericBaseId =
						typeof baseEventId === "string"
							? parseInt(baseEventId, 10)
							: baseEventId;
					onDelete(numericBaseId, "all");
				}
			}

			setPendingAction(null);
		}
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
		confirmationModal,
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
	rules: ValidationRules,
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

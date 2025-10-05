import React, { useState } from "react";
import { Event, EventFormDataForValidation } from "@src/features/event/type";
import { TAGS } from "@src/features/event/constants";
import useNotifications from "@src/lib/hooks/useNotifications";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import Button from "@src/components/ui/button/Button";
import { ModalLayout } from "@src/features/event/components/forms/ModalLayout";
import { useFormConfig } from "@src/features/event/lib/hooks";
import { FormField } from "@src/features/event/components/forms/FormField";
import {
	EventFormData,
	FormField as EventFormField,
} from "@src/features/event/type";
import {
	getCurrentDate,
	getCurrentTime,
	addMinutes,
	isValidTimeRange,
	updateEventFormData,
} from "@src/features/event/lib/utils";
import { useFormValidation } from "@src/features/event/lib/hooks";
import { EVENT_VALIDATION_RULES } from "@src/features/event/constants";
import PreviewEditor from "@src/components/shared/preview_editor/PreviewEditor";

interface EventFormProps {
	onSave: (event: Omit<Event, "id">) => void;
	onCancel: () => void;
}

const COMMON_INPUT_STYLES =
	"rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const EventForm: React.FC<EventFormProps> = ({ onSave, onCancel }) => {
	const { notifications, showNotification } = useNotifications();
	const { formFields } = useFormConfig();

	const [formData, setFormData] = useState<EventFormData>({
		title: "",
		content: "",
		tag: TAGS[0].name,
		startDate: getCurrentDate(),
		endDate: getCurrentDate(),
		startTime: getCurrentTime(),
		endTime: addMinutes(getCurrentTime(), 30),
		color: TAGS[0].color,
		repeatType: "none",
		repeatLimit: 0,
	});

	const { errors, validate } = useFormValidation(
		formData as EventFormDataForValidation,
		EVENT_VALIDATION_RULES
	);

	const updateField = (
		field: keyof EventFormData,
		value: string | number
	): void => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleFieldChange = (
		field: EventFormField,
		value: string | number
	): void => {
		let updates: Partial<EventFormData> = { [field.key]: value };

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

		setFormData((prev) => updateEventFormData(prev, updates));
	};

	// ADDED: Handler for content changes from PreviewEditor
	const handleContentChange = (
		e: React.ChangeEvent<HTMLTextAreaElement> | string
	) => {
		const value = typeof e === "string" ? e : e.target.value;
		updateField("content", value);
	};

	const handleSubmit = (): void => {
		if (!validate()) {
			const firstError = Object.values(errors)[0];
			showNotification(firstError, "error");
			return;
		}

		if (
			!isValidTimeRange(
				formData.startDate,
				formData.startTime,
				formData.endDate,
				formData.endTime
			)
		) {
			showNotification("End time must be after start time.", "error");
			return;
		}

		onSave(formData);
		showNotification(
			`Event "${formData.title}" created successfully!`,
			"success"
		);
	};

	const row1Fields = formFields.filter((field) => field.row === 1);
	const row2Fields = formFields.filter((field) => field.row === 2);

	const footer = (
		<div className="flex justify-end gap-2">
			<Button
				onClick={onCancel}
				className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
			>
				Cancel
			</Button>
			<Button
				onClick={handleSubmit}
				className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
			>
				Add Event
			</Button>
		</div>
	);

	return (
		<>
			<ModalLayout
				title="Create New Event"
				onClose={onCancel}
				maxWidth="max-w-4xl"
				footer={footer}
			>
				<>
					{/* Row 1: Title, Tag, Repeat, Repeat Limit */}
					<div className="grid grid-cols-5 gap-2 mb-2">
						{row1Fields.map((field) => (
							<FormField
								key={field.id}
								field={field}
								formData={formData}
								onFieldChange={handleFieldChange}
								commonInputStyles={COMMON_INPUT_STYLES}
							/>
						))}
					</div>

					{/* Row 2: Start Date/Time, End Date/Time */}
					<div className="grid grid-cols-4 gap-3 mb-4">
						{row2Fields.map((field) => (
							<FormField
								key={field.id}
								field={field}
								formData={formData}
								onFieldChange={handleFieldChange}
								commonInputStyles={COMMON_INPUT_STYLES}
							/>
						))}
					</div>

					{/* REPLACED: Content Editor with PreviewEditor */}
					<div>
						{/* <div className="flex items-center justify-between mb-2"> */}
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Content (Markdown supported)
						</label>
						{/* </div> */}

						{/* PreviewEditor with fixed height */}
						<div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50/20 dark:bg-gray-700/20">
							<PreviewEditor
								value={formData.content}
								onChange={handleContentChange}
								mode={"edit"}
								placeholder="Enter event details in markdown..."
								className="h-full"
							/>
						</div>

						{errors.content && (
							<p className="text-red-500 text-xs mt-1">
								{errors.content}
							</p>
						)}
					</div>
				</>
			</ModalLayout>

			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default EventForm;

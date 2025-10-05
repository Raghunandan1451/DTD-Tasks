import React from "react";
import { Event } from "@src/features/event/type";
import { EventHeader } from "@src/features/event/components/modal/EventHeader";
import { EventDetails } from "@src/features/event/components/modal/EventDetails";
import { ContentSection } from "@src/features/event/components/modal/ContentSection";
import { RecurringOptionsModal } from "@src/features/event/components/modal/RecurringOptionsModal";
import { useEventModal } from "@src/features/event/lib/hooks";

interface EventModalProps {
	event: Event;
	onUpdate: (event: Event, editType?: "single" | "all") => void;
	onDelete: (eventId: string | number, deleteType?: "single" | "all") => void;
	onClose: () => void;
	allEvents?: Event[];
}

const EventModal: React.FC<EventModalProps> = ({
	event,
	onUpdate,
	onDelete,
	onClose,
	allEvents = [],
}) => {
	const {
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
	} = useEventModal({
		event,
		onUpdate,
		onDelete,
		allEvents,
	});

	return (
		<>
			<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
				<div className="bg-gray-50/40 dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
					<EventHeader
						event={event}
						editData={editData}
						isEditing={isEditing}
						isRecurringInstance={Boolean(isRecurringInstance)}
						onEdit={() => setIsEditing(true)}
						onDelete={handleDelete}
						onSave={handleSave}
						onCancel={handleCancel}
						onClose={onClose}
						onTitleChange={handleTitleChange}
					/>

					<div className="p-4">
						<EventDetails
							event={event}
							editData={editData}
							isEditing={isEditing}
							isRecurringInstance={Boolean(isRecurringInstance)}
							actualBaseEvent={actualBaseEvent}
							onTagChange={handleTagChange}
							onDateTimeChange={handleDateTimeChange}
						/>

						<ContentSection
							content={event.content}
							editContent={editData.content}
							isEditing={isEditing}
							onContentChange={handleContentChange}
						/>
					</div>
				</div>
			</div>

			{showRecurringOptions && pendingAction && (
				<RecurringOptionsModal
					event={event}
					pendingAction={pendingAction}
					onAction={handleRecurringAction}
					onCancel={() => {
						handleCancel();
					}}
				/>
			)}
		</>
	);
};

export default EventModal;

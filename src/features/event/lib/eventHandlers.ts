// @src/features/event/utils/eventHandlers.ts
import { AppDispatch } from "@src/lib/store/store";
import {
	addEvent,
	updateEvent,
	deleteEvent,
	setSelectedEvent,
	setShowAddForm,
} from "@src/lib/store/slices/calendarSlice";
import { Event } from "@src/features/event/type";
import { getBaseEventId } from "@src/features/event/lib/utils";

export const handleAddEvent = (
	dispatch: AppDispatch,
	eventData: Omit<Event, "id">
) => {
	dispatch(addEvent({ ...eventData, id: Date.now() }));
	dispatch(setShowAddForm(false));
};

export const handleUpdateEvent = (
	dispatch: AppDispatch,
	events: Event[],
	updatedEvent: Event,
	editType?: "single" | "all"
) => {
	const isRecurringInstance =
		typeof updatedEvent.id === "string" && updatedEvent.id.includes("-");

	if (editType === "single" && isRecurringInstance) {
		const baseEventId = getBaseEventId(updatedEvent.id as string);
		const numericBaseId =
			typeof baseEventId === "string"
				? parseInt(baseEventId, 10)
				: baseEventId;

		const baseEvent = events.find((e) => e.id === numericBaseId);
		if (baseEvent) {
			const excludedDate = updatedEvent.startDate;
			const updatedBaseEvent = {
				...baseEvent,
				excludedDates: [
					...(baseEvent.excludedDates || []),
					excludedDate,
				],
			};
			dispatch(updateEvent(updatedBaseEvent));

			const newExceptionEvent: Event = {
				...updatedEvent,
				id: Date.now(),
				repeatType: "none",
				originalEventId: numericBaseId,
				repeatLimit: 0,
				recurring: undefined,
				excludedDates: undefined,
			};
			dispatch(addEvent(newExceptionEvent));
		}
	} else if (editType === "all" && isRecurringInstance) {
		// FIXED: Get the base event ID and update the base event with new data
		const baseEventId = getBaseEventId(updatedEvent.id as string);
		const numericBaseId =
			typeof baseEventId === "string"
				? parseInt(baseEventId, 10)
				: baseEventId;

		const baseEvent = events.find((e) => e.id === numericBaseId);
		if (baseEvent) {
			// Update the base event with changes from the instance
			const updatedBaseEvent = {
				...baseEvent,
				...updatedEvent,
				id: numericBaseId, // Keep the base event ID
				// Preserve recurring properties from base event
				repeatType: baseEvent.repeatType,
				repeatLimit: baseEvent.repeatLimit,
				recurring: baseEvent.recurring,
				excludedDates: baseEvent.excludedDates,
			};
			dispatch(updateEvent(updatedBaseEvent));
		}
	} else {
		// Non-recurring event or direct base event edit
		dispatch(updateEvent(updatedEvent));
	}

	dispatch(setSelectedEvent(null));
};

export const handleDeleteEvent = (
	dispatch: AppDispatch,
	events: Event[],
	eventId: string | number,
	deleteType?: "single" | "all"
) => {
	if (deleteType === "single") {
		const isInstanceId =
			typeof eventId === "string" && eventId.includes("-");

		if (isInstanceId) {
			const baseEventId = getBaseEventId(eventId as string);
			const numericBaseId =
				typeof baseEventId === "string"
					? parseInt(baseEventId, 10)
					: baseEventId;

			const baseEvent = events.find((e) => e.id === numericBaseId);
			if (baseEvent) {
				const dateToExclude = (eventId as string)
					.split("-")
					.slice(1)
					.join("-");
				const updatedBaseEvent = {
					...baseEvent,
					excludedDates: [
						...(baseEvent.excludedDates || []),
						dateToExclude,
					],
				};
				dispatch(updateEvent(updatedBaseEvent));
			}
		} else {
			dispatch(deleteEvent(eventId));
		}
	} else if (deleteType === "all") {
		const numericId =
			typeof eventId === "string" && eventId.includes("-")
				? parseInt(getBaseEventId(eventId), 10)
				: eventId;
		dispatch(deleteEvent(numericId));
	} else {
		dispatch(deleteEvent(eventId));
	}

	dispatch(setSelectedEvent(null));
};

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@src/lib/store/store"; // adjust path
import {
	addEvent,
	updateEvent,
	deleteEvent,
	setCurrentDate,
	setViewMode,
	setSelectedEvent,
	setShowAddForm,
} from "@src/lib/store/slices/calendarSlice";
import { hydrateCalendar } from "@src/lib/store/thunks/calendarThunk";

import { Event } from "@src/features/event/type";
import CalendarGrid from "@src/features/event/CalendarGrid";
import EventForm from "@src/features/event/EventForm";
import EventModal from "@src/features/event/EventModal";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import ControlBar from "@src/features/event/ControlBar";
import { getBaseEventId } from "@src/features/event/lib/utils";

const EventTracker = () => {
	const dispatch = useDispatch<AppDispatch>();

	// Redux state
	const {
		events,
		currentDate,
		viewMode,
		selectedEvent,
		showAddForm,
		loading,
		error,
	} = useSelector((state: RootState) => state.calendar);

	// Hydrate calendar state from IndexedDB on mount
	useEffect(() => {
		dispatch(hydrateCalendar());
	}, [dispatch]);

	// Event handlers
	const handleAddEvent = (eventData: Omit<Event, "id">) => {
		dispatch(
			addEvent({
				...eventData,
				id: Date.now(),
			})
		);
		dispatch(setShowAddForm(false));
	};

	const handleUpdateEvent = (
		updatedEvent: Event,
		editType?: "single" | "all"
	) => {
		// Check if this is a recurring instance
		const isRecurringInstance =
			typeof updatedEvent.id === "string" &&
			updatedEvent.id.includes("-");

		if (editType === "single" && isRecurringInstance) {
			const baseEventId = getBaseEventId(updatedEvent.id as string);

			// Convert string ID to number for finding base event
			const numericBaseId =
				typeof baseEventId === "string"
					? parseInt(baseEventId, 10)
					: baseEventId;

			const baseEvent = events.find((e) => e.id === numericBaseId);

			if (baseEvent) {
				// 1. Update base event to exclude this date
				const excludedDate = updatedEvent.startDate;
				const updatedBaseEvent = {
					...baseEvent,
					excludedDates: [
						...(baseEvent.excludedDates || []),
						excludedDate,
					],
				};
				dispatch(updateEvent(updatedBaseEvent));

				// 2. Create the modified occurrence as a new event
				const newExceptionEvent: Event = {
					...updatedEvent,
					id: Date.now(), // Generate new unique numeric ID
					repeatType: "none", // Exception events don't repeat
					originalEventId: numericBaseId, // Now it's a number, not string
					repeatLimit: 0, // No repeat limit for exceptions
					recurring: undefined, // Remove recurring config
					excludedDates: undefined, // Exception events don't have excluded dates
				};
				dispatch(addEvent(newExceptionEvent));
			}
		} else if (editType === "all") {
			// Update the base event
			dispatch(updateEvent(updatedEvent));
		} else {
			// Regular single event update
			dispatch(updateEvent(updatedEvent));
		}

		dispatch(setSelectedEvent(null));
	};

	// In your onDelete handler
	const handleDeleteEvent = (
		eventId: string | number,
		deleteType?: "single" | "all"
	) => {
		if (deleteType === "single") {
			// Check if this is a recurring instance
			const isInstanceId =
				typeof eventId === "string" && eventId.includes("-");

			if (isInstanceId) {
				const baseEventId = getBaseEventId(eventId as string);

				// Convert to numeric ID
				const numericBaseId =
					typeof baseEventId === "string"
						? parseInt(baseEventId, 10)
						: baseEventId;

				const baseEvent = events.find((e) => e.id === numericBaseId);

				if (baseEvent) {
					// Extract the date from the instance ID (e.g., "1-2025-09-30" -> "2025-09-30")
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
				// Regular single event - just delete it
				dispatch(deleteEvent(eventId));
			}
		} else if (deleteType === "all") {
			// Delete the base event (all occurrences)
			// Make sure we're using the numeric base ID
			const numericId =
				typeof eventId === "string" && eventId.includes("-")
					? parseInt(getBaseEventId(eventId), 10)
					: eventId;

			dispatch(deleteEvent(numericId));
		} else {
			// Regular delete without type specified
			dispatch(deleteEvent(eventId));
		}

		dispatch(setSelectedEvent(null));
	};

	// Navigation logic
	const navigateDate = (direction: "prev" | "next") => {
		const newDate = new Date(currentDate);
		if (viewMode === "weekly") {
			newDate.setDate(
				newDate.getDate() + (direction === "next" ? 7 : -7)
			);
		} else {
			newDate.setDate(
				newDate.getDate() + (direction === "next" ? 1 : -1)
			);
		}
		dispatch(setCurrentDate(newDate.toISOString().split("T")[0]));
	};

	// Date label for header
	const getDateRange = () => {
		const baseDate = new Date(currentDate);

		if (viewMode === "weekly") {
			const startOfWeek = new Date(baseDate);
			const day = startOfWeek.getDay();
			const diff = startOfWeek.getDate() - day;
			startOfWeek.setDate(diff);

			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6);

			return {
				start: startOfWeek,
				end: endOfWeek,
				label: `${startOfWeek.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				})} - ${endOfWeek.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				})}`,
			};
		} else {
			return {
				start: baseDate,
				end: baseDate,
				label: baseDate.toLocaleDateString("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
					year: "numeric",
				}),
			};
		}
	};

	const dateRange = getDateRange();

	return (
		<>
			{/* Header */}
			<TitleWithButton
				heading="Event Tracker"
				buttonText="Export as PDF"
				onDownload={() => console.log("Exporting PDF...")}
			/>

			{/* Control Bar */}
			<ControlBar
				dateLabel={dateRange.label}
				viewMode={viewMode}
				isMobile={window.innerWidth < 768}
				onNavigate={navigateDate}
				onViewModeChange={(mode) => dispatch(setViewMode(mode))}
				onAddEvent={() => dispatch(setShowAddForm(true))}
			/>

			{/* Calendar Grid */}
			<CalendarGrid
				events={events}
				currentDate={new Date(currentDate)}
				viewMode={viewMode}
				onEventClick={(event) => dispatch(setSelectedEvent(event))}
			/>

			{/* Event Form Modal */}
			{showAddForm && (
				<EventForm
					onSave={handleAddEvent}
					onCancel={() => dispatch(setShowAddForm(false))}
				/>
			)}

			{/* Event Details Modal */}
			{selectedEvent && (
				<EventModal
					event={selectedEvent}
					onUpdate={handleUpdateEvent}
					onDelete={handleDeleteEvent}
					onClose={() => dispatch(setSelectedEvent(null))}
					allEvents={events}
				/>
			)}

			{/* Loading / Error UI */}
			{loading && <p className="text-gray-500">Loading...</p>}
			{error && <p className="text-red-500">{error}</p>}
		</>
	);
};

export default EventTracker;

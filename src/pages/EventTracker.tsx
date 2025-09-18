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

	const handleUpdateEvent = (updatedEvent: Event) => {
		dispatch(updateEvent(updatedEvent));
		dispatch(setSelectedEvent(null));
	};

	const handleDeleteEvent = (id: number) => {
		dispatch(deleteEvent(id));
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
				/>
			)}

			{/* Loading / Error UI */}
			{loading && <p className="text-gray-500">Loading...</p>}
			{error && <p className="text-red-500">{error}</p>}
		</>
	);
};

export default EventTracker;

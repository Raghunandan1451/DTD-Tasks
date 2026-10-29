import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@src/lib/store/store";
import {
	setViewMode,
	setSelectedEvent,
	setShowAddForm,
	setCalendarState,
} from "@src/lib/store/slices/calendarSlice";
import { hydrateCalendar } from "@src/lib/store/thunks/calendarThunk";

import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import ControlBar from "@src/features/event/ControlBar";
import CalendarGrid from "@src/features/event/CalendarGrid";
import EventForm from "@src/features/event/EventForm";
import EventModal from "@src/features/event/EventModal";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";

import { getDateRange, navigateDate } from "@src/features/event/lib/utils";
import {
	handleAddEvent,
	handleUpdateEvent,
	handleDeleteEvent,
} from "@src/features/event/lib/eventHandlers";
import useNotifications from "@src/lib/hooks/useNotifications";
import {
	handleCalendarExport,
	handleJSONUpload,
} from "@src/lib/utils/downloadHandler";
import type { CalendarData } from "@src/lib/types/downloadHandlerTypes";

const EventTracker = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { notifications, showNotification } = useNotifications();
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	const {
		events,
		currentDate,
		viewMode,
		selectedEvent,
		showAddForm,
		loading,
		error,
	} = useSelector((state: RootState) => state.calendar);

	const calendarState = useSelector((state: RootState) => state.calendar);

	useEffect(() => {
		dispatch(hydrateCalendar());
	}, [dispatch]);

	const dateRange = getDateRange(currentDate, viewMode);

	const handleDownload = () => {
		return handleCalendarExport(calendarState, showNotification);
	};

	const handleUpload = (file: File) => {
		return handleJSONUpload<CalendarData>(
			file,
			(data) => {
				dispatch(setCalendarState(data));
				showNotification(
					"Calendar data restored successfully",
					"success"
				);
			},
			(error) => {
				showNotification(error, "error");
			},
			showNotification
		);
	};
	useEffect(() => {
		const handleResize = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);

			if (mobile && viewMode !== "daily") {
				dispatch(setViewMode("daily"));
			}
		};

		handleResize();

		window.addEventListener("resize", handleResize);

		return () => window.removeEventListener("resize", handleResize);
	}, [dispatch, viewMode]);

	return (
		<>
			<TitleWithButton
				heading="Event Tracker"
				buttonText="Download"
				onDownload={handleDownload}
				onUpload={handleUpload}
				showUpload={true}
				showNotification={showNotification}
			/>

			<ControlBar
				dateLabel={dateRange.label}
				viewMode={viewMode}
				isMobile={isMobile}
				onNavigate={(dir) =>
					navigateDate(dispatch, currentDate, viewMode, dir)
				}
				onViewModeChange={(mode) => dispatch(setViewMode(mode))}
				onAddEvent={() => dispatch(setShowAddForm(true))}
			/>

			<CalendarGrid
				events={events}
				currentDate={new Date(currentDate)}
				viewMode={viewMode}
				onEventClick={(event) => dispatch(setSelectedEvent(event))}
			/>

			{showAddForm && (
				<EventForm
					onSave={(data) => handleAddEvent(dispatch, data)}
					onCancel={() => dispatch(setShowAddForm(false))}
				/>
			)}

			{selectedEvent && (
				<EventModal
					event={selectedEvent}
					allEvents={events}
					onUpdate={(event, type) =>
						handleUpdateEvent(dispatch, events, event, type)
					}
					onDelete={(id, type) =>
						handleDeleteEvent(dispatch, events, id, type)
					}
					onClose={() => dispatch(setSelectedEvent(null))}
				/>
			)}

			{loading && <p className="text-gray-500">Loading...</p>}
			{error && <p className="text-red-500">{error}</p>}

			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default EventTracker;

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
import type { Event } from "@src/features/event/type";

import { getDateRange, navigateDate } from "@src/features/event/lib/utils";
import { generateWeeklyCalendarScreenshot } from "@src/features/event/lib/utils";
import {
	handleAddEvent,
	handleUpdateEvent,
	handleDeleteEvent,
} from "@src/features/event/lib/eventHandlers";
import useNotifications from "@src/lib/hooks/useNotifications";
import {
	deleteOutputFile,
	queueOutputWrite,
	readOutputFile,
	readOutputFiles,
	writeOutputFile,
} from "@src/lib/utils/fileStorage/outputFiles";
import { hasOutputDirectory } from "@src/lib/utils/fileStorage/outputDirectory";

const isEvent = (value: unknown): value is Event =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	(typeof value.id === "string" || typeof value.id === "number") &&
	"title" in value &&
	typeof value.title === "string" &&
	"content" in value &&
	typeof value.content === "string" &&
	"tag" in value &&
	typeof value.tag === "string" &&
	"startDate" in value &&
	typeof value.startDate === "string" &&
	"endDate" in value &&
	typeof value.endDate === "string" &&
	"color" in value &&
	typeof value.color === "string" &&
	"repeatType" in value &&
	(value.repeatType === "none" ||
		value.repeatType === "daily" ||
		value.repeatType === "weekly" ||
		value.repeatType === "monthly") &&
	"repeatLimit" in value &&
	typeof value.repeatLimit === "number";

const EventTracker = () => {
	const dispatch = useDispatch<AppDispatch>();
	const { notifications, showNotification } = useNotifications();
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
	const [outputHydrated, setOutputHydrated] = useState(false);

	const {
		events,
		currentDate,
		viewMode,
		selectedEvent,
		showAddForm,
		loading,
		error,
	} = useSelector((state: RootState) => state.calendar);

	useEffect(() => {
		let cancelled = false;
		void dispatch(hydrateCalendar())
			.unwrap()
			.then(async () => {
				if (!(await hasOutputDirectory())) {
					if (!cancelled) setOutputHydrated(true);
					return;
				}
				const monthlyFiles = await readOutputFiles(
					"Events",
					(name) =>
						name.startsWith("events-") && name.endsWith(".json"),
				);
				const indexJSON = await readOutputFile("Events/index.json");
				if (indexJSON) {
					const index: unknown = JSON.parse(indexJSON);
					if (
						typeof index !== "object" ||
						index === null ||
						!("months" in index) ||
						!Array.isArray(index.months) ||
						!index.months.every(
							(month) =>
								typeof month === "string" &&
								/^\d{4}-\d{2}$/.test(month),
						)
					) {
						throw new Error("Invalid Events index JSON file.");
					}
				}
				const eventsFromFiles = monthlyFiles.flatMap(({ content }) => {
					const parsed: unknown = JSON.parse(content);
					if (
						typeof parsed !== "object" ||
						parsed === null ||
						!("events" in parsed) ||
						!Array.isArray(parsed.events)
					) {
						throw new Error("Invalid Events JSON file.");
					}
					if (!parsed.events.every(isEvent)) {
						throw new Error("Events JSON contains invalid event data.");
					}
					return parsed.events;
				});
				if (!cancelled && (monthlyFiles.length > 0 || indexJSON !== null)) {
					dispatch(
						setCalendarState({
							events: Array.from(
								new Map(
									eventsFromFiles.map((event) => [
										event.id,
										event,
									]),
								).values(),
							),
							selectedEvent: null,
						}),
					);
				}
				if (!cancelled) setOutputHydrated(true);
			})
			.catch((error: unknown) => {
				console.error("Failed to load Events JSON files:", error);
				showNotification("Unable to read saved Events JSON files", "error");
			});
		return () => {
			cancelled = true;
		};
	}, [dispatch, showNotification]);

	const calendarState = useSelector((state: RootState) => state.calendar);
	useEffect(() => {
		if (!calendarState.loaded || !outputHydrated) return;
		void queueOutputWrite(async () => {
			if (!(await hasOutputDirectory())) return;

			const groupedEvents = calendarState.events.reduce<
				Record<string, Event[]>
			>((groups, event) => {
				const month = event.startDate.substring(0, 7);
				(groups[month] ??= []).push(event);
				return groups;
			}, {});

			const existingFiles = await readOutputFiles(
				"Events",
				(name) =>
					name.startsWith("events-") && name.endsWith(".json"),
			);
			const expectedPaths = new Set(
				Object.keys(groupedEvents).map((month) => {
					const [year, monthNumber] = month.split("-");
					return `Events/${year}/${monthNumber}/events-${month}.json`;
				}),
			);
			await Promise.all(
				existingFiles
					.filter(({ path }) => !expectedPaths.has(path))
					.map(({ path }) => deleteOutputFile(path)),
			);

			await Promise.all(
				Object.entries(groupedEvents).map(([month, eventsInMonth]) => {
					const [year, monthNumber] = month.split("-");
					return writeOutputFile(
						`Events/${year}/${monthNumber}/events-${month}.json`,
						JSON.stringify({ month, events: eventsInMonth }, null, 2),
					);
				}),
			);
			await writeOutputFile(
				"Events/index.json",
				JSON.stringify(
					{ months: Object.keys(groupedEvents).sort() },
					null,
					2,
				),
			);

			if (calendarState.events.length > 0) {
				const image = await generateWeeklyCalendarScreenshot(
					calendarState.events,
					calendarState.currentDate,
				);
				if (!image) {
					throw new Error("Unable to generate the calendar image.");
				}
				await writeOutputFile(
					`Events/${calendarState.currentDate.substring(0, 4)}/${calendarState.currentDate.substring(5, 7)}/calendar-${calendarState.currentDate}.png`,
					image,
				);
			}
		}).catch((error: unknown) => {
			console.error("Failed to save Events files:", error);
			showNotification(
				error instanceof Error
					? error.message
					: "Unable to save Events files",
				"error",
			);
		});
	}, [
		calendarState.currentDate,
		calendarState.events,
		calendarState.loaded,
		outputHydrated,
		showNotification,
	]);

	const dateRange = getDateRange(currentDate, viewMode);
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
			<TitleWithButton heading="Event Tracker" />

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

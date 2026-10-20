import JSZip from "jszip";
import { saveAs } from "file-saver";
import { generateWeeklyCalendarScreenshot } from "@src/features/event/lib/utils";
import type { CalendarData, ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
import { createICS, formatTimestamp } from "./common";

export const handleCalendarExport = async (
	calendarData: CalendarData,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	const events = calendarData?.events || [];

	if (!events.length) {
		showNotification?.("No calendar events to export", "error");
		return;
	}

	try {
		const zip = new JSZip();

		// Add calendar JSON
		zip.file("calendar-data.json", JSON.stringify(calendarData, null, 2));

		// Add ICS file
		const icsContent = createICS(events);
		zip.file("calendar.ics", icsContent);

		// Add weekly screenshot
		const screenshot = await generateWeeklyCalendarScreenshot(
			events,
			calendarData.currentDate,
		);
		if (screenshot) {
			zip.file("weekly-schedule.png", screenshot);
		} else {
			console.warn("Screenshot generation failed");
		}

		// Add metadata
		zip.file(
			"meta.json",
			JSON.stringify(
				{
					type: "Calendar",
					count: events.length,
					exportedAt: new Date().toISOString(),
				},
				null,
				2,
			),
		);

		const blob = await zip.generateAsync({ type: "blob" });

		saveAs(blob, `calendar-export_${formatTimestamp()}.zip`);
		showNotification?.("Calendar exported successfully", "success");
	} catch (error) {
		console.error("Calendar export error:", error);
		showNotification?.("Failed to export calendar", "error");
	}
};

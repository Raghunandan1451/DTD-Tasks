import { createAsyncThunk } from "@reduxjs/toolkit";
import { CalendarState } from "@src/features/event/type";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import { setCalendarState } from "@src/lib/store/slices/calendarSlice";
// Async thunk for hydrating calendar data from IndexedDB
export const hydrateCalendar = createAsyncThunk(
	"calendar/hydrate",
	async (_, { dispatch }) => {
		const data = await getFromIndexedDB<CalendarState>(
			"redux_calendar_data"
		);

		if (data) {
			dispatch(
				setCalendarState({
					...data,
					currentDate: new Date().toISOString().split("T")[0], // set on hydrate
				})
			);
		} else {
			console.warn(
				"[Hydrate] No calendar data found, using initial state"
			);
		}
	}
);

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CalendarState, Event } from "@src/lib/types/event";
import { hydrateCalendar } from "@src/lib/store/thunks/calendarThunk";

const initialState: CalendarState = {
	events: [],
	currentDate: new Date().toISOString().split("T")[0],
	viewMode: "weekly",
	selectedEvent: null,
	showAddForm: false,
	loading: false,
	error: null,
	loaded: false,
};

const calendarSlice = createSlice({
	name: "calendar",
	initialState,
	reducers: {
		// Event actions
		addEvent: (state, action: PayloadAction<Event>) => {
			state.events.push(action.payload);
		},
		updateEvent: (state, action: PayloadAction<Event>) => {
			const index = state.events.findIndex(
				(event) => event.id === action.payload.id
			);
			if (index !== -1) {
				state.events[index] = action.payload;
			}
		},
		deleteEvent: (state, action: PayloadAction<number>) => {
			state.events = state.events.filter(
				(event) => event.id !== action.payload
			);
		},

		// UI state actions
		setCurrentDate: (state, action: PayloadAction<string>) => {
			state.currentDate = action.payload;
		},
		setViewMode: (state, action: PayloadAction<"daily" | "weekly">) => {
			state.viewMode = action.payload;
		},
		setSelectedEvent: (state, action: PayloadAction<Event | null>) => {
			state.selectedEvent = action.payload;
		},
		setShowAddForm: (state, action: PayloadAction<boolean>) => {
			state.showAddForm = action.payload;
		},

		// Bulk state setter for hydration
		setCalendarState: (
			state,
			action: PayloadAction<Partial<CalendarState>>
		) => {
			return { ...state, ...action.payload, loading: false, error: null };
		},

		// Error handling
		setError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.loading = false;
		},
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(hydrateCalendar.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(hydrateCalendar.fulfilled, (state) => {
				state.loading = false;
				state.loaded = true; // 👈 mark as loaded
			})
			.addCase(hydrateCalendar.rejected, (state, action) => {
				state.loading = false;
				state.loaded = true; // 👈 even if failed, mark as loaded
				state.error =
					action.error.message || "Failed to hydrate calendar data";
			});
	},
});

export const {
	addEvent,
	updateEvent,
	deleteEvent,
	setCurrentDate,
	setViewMode,
	setSelectedEvent,
	setShowAddForm,
	setCalendarState,
	setError,
	clearError,
} = calendarSlice.actions;

export default calendarSlice.reducer;

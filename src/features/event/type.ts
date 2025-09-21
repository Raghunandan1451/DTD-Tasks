export type RepeatType = "none" | "daily" | "weekly" | "monthly";

export interface Event {
	id: string | number;
	title: string;
	content: string;
	tag: string;
	startDate: string;
	endDate: string;
	startTime: string;
	endTime: string;
	color: string;
	repeatType: RepeatType;
	repeatLimit: number;
	recurring?: {
		type: "daily" | "weekly" | "monthly";
		interval?: number;
		endDate?: string;
		daysOfWeek?: number[];
		dayOfMonth?: number;
	};
}

// Helper type for creating new events
export type EventInput = Omit<Event, "id">;

export interface TimeSlot {
	hour: number;
	label: string;
}

export interface DateColumn {
	date: Date;
	dateString: string;
	isToday: boolean;
}

export interface CalendarState {
	events: Event[];
	currentDate: string;
	viewMode: "daily" | "weekly";
	selectedEvent: Event | null;
	showAddForm: boolean;
	loading: boolean;
	error: string | null;
	loaded?: boolean;
}

export interface CalendarGridProps {
	events: Event[];
	currentDate: Date;
	viewMode: "daily" | "weekly";
	onEventClick: (event: Event) => void;
}

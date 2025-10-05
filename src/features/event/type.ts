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
	excludedDates?: string[]; // ADD THIS
	originalEventId?: number;
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

export interface EventFormData {
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
}

export type EventFormDataForValidation = EventFormData &
	Record<string, unknown>;

export interface FormField<
	K extends keyof EventFormData = keyof EventFormData
> {
	id: string;
	label: string;
	type: "text" | "date" | "time" | "select" | "number";
	key: K;
	iconName?: "tag" | "calendar" | "clock" | "repeat";
	placeholder?: string;
	options?: string[];
	min?: string;
	max?: string;
	span: number;
	row: number;
	disabled?: (formData: EventFormData) => boolean;
	onChange?: (
		value: EventFormData[K],
		formData: EventFormData
	) => Partial<EventFormData>;
}

export interface ValidationRule {
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	custom?: (value: unknown) => boolean;
	message: string;
}

export interface ValidationRules {
	[key: string]: ValidationRule[];
}

export interface ValidationErrors {
	[key: string]: string;
}

export interface UseEventModalProps {
	event: Event;
	onUpdate: (event: Event, editType?: "single" | "all") => void;
	onDelete: (eventId: string | number, deleteType?: "single" | "all") => void;
	baseEvent?: Event;
	allEvents?: Event[];
}

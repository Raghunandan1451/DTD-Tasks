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
}

export type RepeatType = "none" | "daily" | "weekly" | "monthly";

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

export const TAGS = [
	{ name: "Personal", color: "#10b981" },
	{ name: "Work", color: "#3b82f6" },
	{ name: "Shopping", color: "#f59e0b" },
	{ name: "Entertainment", color: "#8b5cf6" },
	{ name: "Health", color: "#ef4444" },
	{ name: "Other", color: "#6b7280" },
];

export const REPEAT_OPTIONS = [
	{ value: "none", label: "No Repeat" },
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
];

import { ValidationRules } from "@src/features/event/type";

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

export const EVENT_VALIDATION_RULES: ValidationRules = {
	title: [
		{ required: true, message: "Event title is required" },
		{ minLength: 2, message: "Title must be at least 2 characters" },
		{ maxLength: 100, message: "Title cannot exceed 100 characters" },
	],
	content: [
		{ required: true, message: "Event content is required" },
		{ minLength: 10, message: "Content must be at least 10 characters" },
	],
	startDate: [{ required: true, message: "Start date is required" }],
	endDate: [{ required: true, message: "End date is required" }],
	startTime: [{ required: true, message: "Start time is required" }],
	endTime: [{ required: true, message: "End time is required" }],
};

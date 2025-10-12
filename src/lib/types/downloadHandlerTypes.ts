import { File, Folder } from "@src/features/markdown/type";
import { ExpenseEntry, FinanceState } from "@src/features/finance/type";
import { Event } from "@src/features/event/type";

// ============================================
// Type Definitions
// ============================================

export interface FileTree {
	path: string;
	type: "file" | "folder";
	content?: string;
	children?: FileTree[];
}

export interface QRData {
	qrData: string;
	selectedIcon: string;
	bgColor: string;
	fgColor: string;
}

export interface CalendarData {
	events: Event[];
	currentDate: string;
	viewMode: "daily" | "weekly";
	selectedEvent: Event | null;
	showAddForm: boolean;
	loading: boolean;
	error: string | null;
	loaded?: boolean;
}

export interface ExpensesData {
	expenses: ExpenseEntry[];
	selectedDate: string;
	loaded: boolean;
}

export interface FileManagerData {
	files: (File | Folder)[];
	selectedFile: string | null;
	content: string;
	loaded: boolean;
}

export interface AppState {
	qr?: QRData;
	fileManager?: FileManagerData;
	finance?: FinanceState;
	expenses?: ExpensesData;
	calendar?: CalendarData;
}

export interface Metadata {
	section: string;
	exportDate: string;
	itemCount: number;
	version: string;
	appName: string;
}

export type ShowNotificationFn = (
	message: string,
	type?: "error" | "success" | "info"
) => void;

import { File, Folder } from "@src/features/markdown/type";
import { FinanceState } from "@src/features/finance/type";
import type { ExpensesState } from "@src/lib/store/slices/expensesSlice";

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

export type ExpensesData = ExpensesState;

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
}

export interface Metadata {
	section: string;
	exportDate: string;
	itemCount: number;
	version: string;
	schemaVersion: number;
	appName: string;
}

export type ShowNotificationFn = (
	message: string,
	type?: "error" | "success" | "info"
) => void;

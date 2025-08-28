export type TimeUnit =
	| "yearly"
	| "semiannual"
	| "quarterly"
	| "monthly"
	| "weekly"
	| "daily";

export type ViewMode = "list" | "graph" | "salary" | "estimate";
export type BalanceChangeType = "salary" | "expense" | "manual";

export interface BalanceSectionProps {
	balance?: number; // Total current balance
	expenses?: number; // Total expenses (optional)
	remaining?: number; // Remaining after expenses (optional)
	simulatedRemaining?: number; // Optional simulated balance
	viewMode?: ViewMode; // view mode control
}
export interface SummaryItemProps {
	label: string; // Label for the summary item
	value: string; // Value to display
}

export interface ExpenseSummaryProps extends BalanceSectionProps {
	onChangeView: (mode: ViewMode) => void;
}
// types.ts
export interface DatedSalary {
	amount: number;
	dayOfMonth: number; // 1–31
}

export interface FinanceState {
	salary: DatedSalary | null;
	currentBalance: number;
	manualOverride: boolean;
	groups: string[];
	loaded: boolean;
	lastUpdatedDate?: string;
}

export interface ControlsProps {
	viewMode: ViewMode;
	onChangeView: (mode: ControlsProps["viewMode"]) => void;
}

export interface ExpenseEntry {
	id: string;
	date: string; // ISO date string
	group: string;
	name: string;
	amount: number; // currency amount
	quantity: number; // numeric quantity
	unit: string; // e.g., lt, kg, pcs
	type?: "Dr" | "Cr";
}

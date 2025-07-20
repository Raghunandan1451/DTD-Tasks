export type TimeUnit =
	| "yearly"
	| "semiannual"
	| "quarterly"
	| "monthly"
	| "weekly"
	| "daily";

export type ViewMode = "list" | "graph" | "salary" | "simulation";

export interface Expense {
	id: string;
	name: string;
	amount: number;
	unit: TimeUnit;
	category?: string;
	startDate: string; // ISO string
	divideToDaily?: boolean; // checkbox
}

export interface SalaryConfig {
	amount: number;
	frequency: TimeUnit; // usually "monthly" or "yearly"
	startDate: string;
}

export interface FinanceState {
	salary: SalaryConfig | null;
	currentBalance: number;
	manualOverride: boolean; // true if user set balance directly
	loaded: boolean;
}

export interface BalanceSectionProps {
	balance: number;
	expenses: number;
	remaining: number;
	simulatedRemaining?: number;
	viewMode: ViewMode;
}

export interface ExpenseSummaryProps extends BalanceSectionProps {
	onChangeView: (mode: ViewMode) => void;
}

export interface SummaryItemProps {
	label: string;
	value: string;
}

export interface ControlsProps {
	viewMode: "list" | "graph" | "salary" | "simulation";
	onChangeView: (mode: ControlsProps["viewMode"]) => void;
}

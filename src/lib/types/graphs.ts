export type DateFilter =
	| "today"
	| "yesterday"
	| "weekly"
	| "monthly"
	| "yearly";

export interface Expense {
	date: string;
	amount: number;
	group: string;
	type?: "Dr" | "Cr";
}

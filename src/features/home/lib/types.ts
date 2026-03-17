export const SECTIONS = ["events", "finance", "files"] as const;
export type Section = (typeof SECTIONS)[number];

export interface StatCard {
	label: string;
	value: string | number;
	loaded: boolean;
}

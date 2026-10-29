import { Section } from "@src/features/home/lib/types";

export const SECTION_META: Record<Section, { label: string; color: string }> = {
	events: {
		label: "Events",
		color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
	},
	finance: {
		label: "Finance & Expenses",
		color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
	},
	files: {
		label: "Files",
		color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
	},
};

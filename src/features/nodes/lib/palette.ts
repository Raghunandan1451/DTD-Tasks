import { BOARD_COLORS, type BoardColor } from "@src/lib/db/types";

export const DEFAULT_BOARD_COLOR: BoardColor = "slate";

export const isBoardColor = (value: unknown): value is BoardColor =>
	typeof value === "string" && (BOARD_COLORS as readonly string[]).includes(value);

/** Returns the colour if it is a palette key, otherwise the default. */
export const toBoardColor = (value: unknown): BoardColor =>
	isBoardColor(value) ? value : DEFAULT_BOARD_COLOR;

interface PaletteEntry {
	label: string;
	/** Fill, border and text classes for a node body. */
	node: string;
	/** Solid chip used in the colour picker. */
	swatch: string;
}

// Full class names, written out literally so Tailwind can see them.
export const PALETTE: Record<BoardColor, PaletteEntry> = {
	slate: {
		label: "Slate",
		node: "bg-slate-100 border-slate-400 text-slate-900 dark:bg-slate-800 dark:border-slate-500 dark:text-slate-100",
		swatch: "bg-slate-400",
	},
	cyan: {
		label: "Cyan",
		node: "bg-cyan-100 border-cyan-500 text-cyan-950 dark:bg-cyan-900/60 dark:border-cyan-400 dark:text-cyan-50",
		swatch: "bg-cyan-500",
	},
	emerald: {
		label: "Emerald",
		node: "bg-emerald-100 border-emerald-500 text-emerald-950 dark:bg-emerald-900/60 dark:border-emerald-400 dark:text-emerald-50",
		swatch: "bg-emerald-500",
	},
	amber: {
		label: "Amber",
		node: "bg-amber-100 border-amber-500 text-amber-950 dark:bg-amber-900/60 dark:border-amber-400 dark:text-amber-50",
		swatch: "bg-amber-500",
	},
	rose: {
		label: "Rose",
		node: "bg-rose-100 border-rose-500 text-rose-950 dark:bg-rose-900/60 dark:border-rose-400 dark:text-rose-50",
		swatch: "bg-rose-500",
	},
	violet: {
		label: "Violet",
		node: "bg-violet-100 border-violet-500 text-violet-950 dark:bg-violet-900/60 dark:border-violet-400 dark:text-violet-50",
		swatch: "bg-violet-500",
	},
};

/** Text-only colour classes for the free "Text" node, which has no box. */
export const TEXT_COLOR: Record<BoardColor, string> = {
	slate: "text-slate-800 dark:text-slate-100",
	cyan: "text-cyan-700 dark:text-cyan-300",
	emerald: "text-emerald-700 dark:text-emerald-300",
	amber: "text-amber-700 dark:text-amber-300",
	rose: "text-rose-700 dark:text-rose-300",
	violet: "text-violet-700 dark:text-violet-300",
};

/** Fill, outline and text classes for the diamond, which is drawn as an SVG. */
export const DIAMOND: Record<BoardColor, string> = {
	slate:
		"fill-slate-100 stroke-slate-400 text-slate-900 dark:fill-slate-800 dark:stroke-slate-500 dark:text-slate-100",
	cyan: "fill-cyan-100 stroke-cyan-500 text-cyan-950 dark:fill-cyan-900/60 dark:stroke-cyan-400 dark:text-cyan-50",
	emerald:
		"fill-emerald-100 stroke-emerald-500 text-emerald-950 dark:fill-emerald-900/60 dark:stroke-emerald-400 dark:text-emerald-50",
	amber:
		"fill-amber-100 stroke-amber-500 text-amber-950 dark:fill-amber-900/60 dark:stroke-amber-400 dark:text-amber-50",
	rose: "fill-rose-100 stroke-rose-500 text-rose-950 dark:fill-rose-900/60 dark:stroke-rose-400 dark:text-rose-50",
	violet:
		"fill-violet-100 stroke-violet-500 text-violet-950 dark:fill-violet-900/60 dark:stroke-violet-400 dark:text-violet-50",
};

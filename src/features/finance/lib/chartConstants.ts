/**
 * Shared color palette for all expense category visualizations
 * (bar chart, pie chart, and PDF report bars). Keeping this in one
 * place means changing the palette only requires editing one file.
 */
const CATEGORY_CHART_COLORS = [
	"#3b82f6", // blue
	"#10b981", // green
	"#f59e0b", // amber
	"#ef4444", // red
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#06b6d4", // cyan
	"#84cc16", // lime
] as const;

export const getCategoryColor = (index: number): string =>
	CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length];

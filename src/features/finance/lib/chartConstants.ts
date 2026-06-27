/**
 * Shared color palette for all expense category visualizations
 * (bar chart, pie chart, and PDF report bars). Keeping this in one
 * place means changing the palette only requires editing one file.
 */
export const CATEGORY_CHART_COLORS = [
	"#3b82f6", // blue
	"#10b981", // green
	"#f59e0b", // amber
	"#ef4444", // red
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#06b6d4", // cyan
	"#84cc16", // lime
] as const;

/** Same palette as RGB tuples, for consumers that need raw RGB (e.g. jsPDF's setFillColor). */
export const CATEGORY_CHART_COLORS_RGB: ReadonlyArray<
	readonly [number, number, number]
> = [
	[59, 130, 246],
	[16, 185, 129],
	[245, 158, 11],
	[239, 68, 68],
	[139, 92, 246],
	[236, 72, 153],
	[6, 182, 212],
	[132, 204, 22],
];

export const getCategoryColor = (index: number): string =>
	CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length];

export const getCategoryColorRgb = (
	index: number
): readonly [number, number, number] =>
	CATEGORY_CHART_COLORS_RGB[index % CATEGORY_CHART_COLORS_RGB.length];

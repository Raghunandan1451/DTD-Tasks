import React from "react";

interface CategoryAxisTickProps {
	x?: number;
	y?: number;
	payload?: {
		value: unknown;
	};
}

const MAX_LINE_LENGTH = 18;

/**
 * Splits a category label into up to two lines so long category names
 * don't get clipped on the chart's Y-axis. Accepts `unknown` because
 * recharts' tick payload isn't guaranteed to be a string at runtime
 * (e.g. malformed/imported expense data) — see categoryGrouping.ts
 * for where this is normalized upstream too.
 */
export const getTickLines = (value: unknown): string[] => {
	const label = typeof value === "string" ? value : String(value ?? "");

	if (label.length <= MAX_LINE_LENGTH) return [label];

	const firstLine = label.slice(0, MAX_LINE_LENGTH).trim();
	const remaining = label.slice(MAX_LINE_LENGTH).trim();
	const secondLine =
		remaining.length > MAX_LINE_LENGTH
			? `${remaining.slice(0, MAX_LINE_LENGTH - 3).trim()}...`
			: remaining;

	return [firstLine, secondLine].filter(Boolean);
};

/** Reusable Y-axis category tick for any vertical bar chart in the finance feature. */
const CategoryAxisTick: React.FC<CategoryAxisTickProps> = ({
	x = 0,
	y = 0,
	payload,
}) => {
	const lines = getTickLines(payload?.value);

	return (
		<text
			x={x - 8}
			y={y}
			textAnchor="end"
			fill="currentColor"
			className="text-xs text-gray-700 dark:text-gray-200"
		>
			{lines.map((line, index) => (
				<tspan key={`${line}-${index}`} x={x - 8} dy={index === 0 ? 0 : 12}>
					{line}
				</tspan>
			))}
		</text>
	);
};

export default CategoryAxisTick;

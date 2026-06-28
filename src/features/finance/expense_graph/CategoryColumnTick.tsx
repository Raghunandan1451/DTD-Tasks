import React from "react";

interface CategoryColumnTickProps {
	x?: number;
	y?: number;
	payload?: { value: unknown };
	maxLabelLength: number;
}

const truncateLabel = (value: unknown, maxLength: number): string => {
	const label = typeof value === "string" ? value : String(value ?? "");
	if (label.length <= maxLength) return label;
	return `${label.slice(0, maxLength - 1).trim()}…`;
};

/**
 * X-axis category tick for the vertical-column bar chart. Centered
 * under each bar (unlike CategoryAxisTick, which right-aligns labels
 * for the old horizontal-bar layout). Truncates instead of wrapping --
 * multi-line labels under narrow columns get visually messy fast,
 * especially as more categories are added or the viewport narrows.
 */
const CategoryColumnTick: React.FC<CategoryColumnTickProps> = ({
	x = 0,
	y = 0,
	payload,
	maxLabelLength,
}) => {
	const label = truncateLabel(payload?.value, maxLabelLength);
	const fullLabel =
		typeof payload?.value === "string" ? payload.value : label;

	return (
		<text
			x={x}
			y={y + 12}
			textAnchor="middle"
			fill="currentColor"
			className="text-xs text-gray-700 dark:text-gray-200"
		>
			<title>{fullLabel}</title>
			{label}
		</text>
	);
};

export default CategoryColumnTick;

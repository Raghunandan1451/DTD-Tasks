import React from "react";
import { Brush } from "recharts";
import { parseISODate } from "@src/features/finance/lib/balanceTrend";
import type { VisibleRange } from "@src/features/finance/hooks/useVisibleRange";

interface ThemedBrushProps {
	range: VisibleRange;
	onRangeChange: (range: VisibleRange) => void;
}

/**
 * recharts' <Brush> defaults to a solid white background rect and
 * light traveler handles that don't respect dark mode -- this was
 * the cause of the white-rectangle visual bug. fill/stroke here read
 * --brush-bg / --brush-border, which should sit next to --tooltip-bg
 * etc. in the global theme (light + dark blocks).
 */
const ThemedBrush: React.FC<ThemedBrushProps> = ({ range, onRangeChange }) => (
	<Brush
		dataKey="date"
		height={24}
		travellerWidth={10}
		startIndex={range.startIndex}
		endIndex={range.endIndex}
		fill="var(--brush-bg, #f9fafb)"
		stroke="var(--brush-border, rgb(107 114 128 / 0.5))"
		tickFormatter={(date) =>
			parseISODate(String(date)).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
			})
		}
		onChange={(nextRange) => {
			if (
				typeof nextRange?.startIndex !== "number" ||
				typeof nextRange?.endIndex !== "number"
			) {
				return;
			}
			onRangeChange({
				startIndex: nextRange.startIndex,
				endIndex: nextRange.endIndex,
			});
		}}
	/>
);

export default ThemedBrush;

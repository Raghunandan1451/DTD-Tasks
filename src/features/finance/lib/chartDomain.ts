/**
 * Computes a padded Y-axis domain for a line/area chart so the line
 * doesn't touch the top/bottom edges of the plot area.
 */
export const computePaddedDomain = (
	values: number[],
	paddingRatio: number = 0.12,
	minPadding: number = 100
): [number, number] => {
	const min = Math.min(...values);
	const max = Math.max(...values);
	const padding = Math.max((max - min) * paddingRatio, minPadding);

	return [Math.floor(min - padding), Math.ceil(max + padding)];
};

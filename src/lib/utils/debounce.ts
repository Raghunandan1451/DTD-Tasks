type DebouncedFunction<T extends (...args: unknown[]) => void> = ((
	...args: Parameters<T>
) => void) & {
	/** Runs a pending call right now instead of waiting. Does nothing if none is pending. */
	flush: () => void;
};

/**
 * Calls `func` once `delay` ms after the last call. With `maxWait`, a steady
 * stream of calls still runs at least that often (so typing without a pause is saved).
 */
export function debounce<T extends (...args: unknown[]) => void>(
	func: T,
	delay: number,
	maxWait?: number,
): DebouncedFunction<T> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let maxTimer: ReturnType<typeof setTimeout> | null = null;
	let pending: Parameters<T> | null = null;

	const clear = () => {
		if (timer) clearTimeout(timer);
		if (maxTimer) clearTimeout(maxTimer);
		timer = null;
		maxTimer = null;
	};

	const run = () => {
		clear();
		if (!pending) return;
		const args = pending;
		pending = null;
		func(...args);
	};

	const debounced = (...args: Parameters<T>) => {
		pending = args;
		if (timer) clearTimeout(timer);
		timer = setTimeout(run, delay);
		if (maxWait !== undefined && !maxTimer) maxTimer = setTimeout(run, maxWait);
	};

	debounced.flush = run;

	return debounced;
}

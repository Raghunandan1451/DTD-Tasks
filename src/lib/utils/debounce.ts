type DebouncedFunction<T extends (...args: unknown[]) => void> = ((
	...args: Parameters<T>
) => void) & {
	/** Runs a pending call right now instead of waiting. Does nothing if none is pending. */
	flush: () => void;
};

export function debounce<T extends (...args: unknown[]) => void>(
	func: T,
	delay: number
): DebouncedFunction<T> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: Parameters<T> | null = null;

	const run = () => {
		timer = null;
		if (!pending) return;
		const args = pending;
		pending = null;
		func(...args);
	};

	const debounced = (...args: Parameters<T>) => {
		pending = args;
		if (timer) clearTimeout(timer);
		timer = setTimeout(run, delay);
	};

	debounced.flush = () => {
		if (timer) clearTimeout(timer);
		run();
	};

	return debounced;
}

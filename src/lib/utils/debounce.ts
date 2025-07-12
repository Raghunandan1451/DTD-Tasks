type DebouncedFunction<T extends (...args: unknown[]) => void> = (
	...args: Parameters<T>
) => void;

export function debounce<T extends (...args: unknown[]) => void>(
	func: T,
	delay: number
): DebouncedFunction<T> {
	let timer: ReturnType<typeof setTimeout> | null;

	return (...args: Parameters<T>) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			func(...args);
		}, delay);
	};
}

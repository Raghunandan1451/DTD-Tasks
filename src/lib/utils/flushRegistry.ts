/** Things that keep unsaved work in memory register a flush here, so "save everything now" is one call. */
const flushers = new Set<() => Promise<void> | void>();

export const registerFlush = (flush: () => Promise<void> | void): (() => void) => {
	flushers.add(flush);
	return () => {
		flushers.delete(flush);
	};
};

export const flushRegistered = async (): Promise<void> => {
	await Promise.all([...flushers].map((flush) => flush()));
};

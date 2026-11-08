import React, { useEffect, useRef } from "react";
import Button from "@src/components/ui/button/Button";

interface InfiniteScrollTriggerProps {
	/** Called when the end of the list scrolls into view. */
	onLoadMore: () => void;
	hasMore: boolean;
	loading: boolean;
	/** How early to start loading, before the end is actually reached. */
	rootMargin?: string;
}

/**
 * Sits at the end of a scrollable list and loads the next page as it comes into
 * view. Where IntersectionObserver is unavailable it falls back to a button.
 */
const InfiniteScrollTrigger: React.FC<InfiniteScrollTriggerProps> = ({
	onLoadMore,
	hasMore,
	loading,
	rootMargin = "300px",
}) => {
	const sentinel = useRef<HTMLDivElement | null>(null);
	const supported = typeof IntersectionObserver !== "undefined";

	// Re-observing after each load makes the observer report again, so a page
	// that is still too short to fill the view keeps loading.
	useEffect(() => {
		const node = sentinel.current;
		if (!supported || !hasMore || loading || !node) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
			},
			{ rootMargin },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [supported, hasMore, loading, onLoadMore, rootMargin]);

	if (!hasMore) return null;

	if (!supported) {
		return (
			<div className="mt-4 flex justify-center">
				<Button
					type="button"
					text={loading ? "Loading..." : "Load more"}
					onClick={onLoadMore}
					disabled={loading}
					className="btn-glass-unselected rounded-full border px-4 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-60"
				/>
			</div>
		);
	}

	return (
		<div
			ref={sentinel}
			role="status"
			aria-live="polite"
			className="mt-4 flex h-8 items-center justify-center text-xs text-gray-500 dark:text-gray-400"
		>
			{loading ? "Loading older activity..." : null}
		</div>
	);
};

export default InfiniteScrollTrigger;

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_WIDTH = 240; // px, matches old w-60
const MIN_WIDTH = 180; // px
const MAX_WIDTH_RATIO = 0.25; // 25% of parent container

/**
 * Drag-to-resize for the file tree panel. Width is clamped between
 * MIN_WIDTH and 25% of the parent container's width.
 */
export const useResizablePanel = () => {
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const containerRef = useRef<HTMLDivElement>(null);
	const isDragging = useRef(false);

	const handlePointerMove = useCallback((e: PointerEvent) => {
		if (!isDragging.current || !containerRef.current) return;

		const parent = containerRef.current.parentElement;
		const containerWidth = parent?.clientWidth ?? window.innerWidth;
		const maxWidth = containerWidth * MAX_WIDTH_RATIO;
		const left = containerRef.current.getBoundingClientRect().left;
		const next = e.clientX - left;

		setWidth(Math.min(Math.max(next, MIN_WIDTH), maxWidth));
	}, []);

	const stopDragging = useCallback(() => {
		isDragging.current = false;
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
	}, []);

	useEffect(() => {
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", stopDragging);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", stopDragging);
		};
	}, [handlePointerMove, stopDragging]);

	const startDragging = useCallback(() => {
		isDragging.current = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	}, []);

	return { width, containerRef, startDragging };
};

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_WIDTH = 240; // px, matches old w-60
const MIN_WIDTH = 180; // px
const MAX_WIDTH_RATIO = 0.25; // 25% of parent container

export interface ResizablePanelOptions {
	/** "left": the panel's left edge is fixed and the handle is on its right edge. "right": the reverse. */
	anchor?: "left" | "right";
	defaultWidth?: number;
	minWidth?: number;
	/** Largest width as a share of the parent container. */
	maxRatio?: number;
}

/**
 * Drag-to-resize for a side panel. Width is clamped between minWidth and
 * maxRatio of the parent container's width. With anchor "right" the panel grows
 * leftwards, for panels that sit on the right of their container.
 */
export const useResizablePanel = ({
	anchor = "left",
	defaultWidth = DEFAULT_WIDTH,
	minWidth = MIN_WIDTH,
	maxRatio = MAX_WIDTH_RATIO,
}: ResizablePanelOptions = {}) => {
	const [width, setWidth] = useState(defaultWidth);
	const containerRef = useRef<HTMLDivElement>(null);
	const isDragging = useRef(false);

	const handlePointerMove = useCallback(
		(e: PointerEvent) => {
			if (!isDragging.current || !containerRef.current) return;

			const parent = containerRef.current.parentElement;
			const containerWidth = parent?.clientWidth ?? window.innerWidth;
			const maxWidth = Math.max(containerWidth * maxRatio, minWidth);
			const rect = containerRef.current.getBoundingClientRect();
			const next = anchor === "left" ? e.clientX - rect.left : rect.right - e.clientX;

			setWidth(Math.min(Math.max(next, minWidth), maxWidth));
		},
		[anchor, maxRatio, minWidth],
	);

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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

export interface ZoomContext {
	/** Chart height in px: the normal height inline, most of the screen when zoomed. */
	height: number;
	/** Put this in the chart's header. It is null inside the zoomed view. */
	zoomButton: React.ReactNode;
	zoomed: boolean;
}

interface ZoomableChartProps {
	/** Names the dialog and the button for screen readers. */
	title: string;
	/** Height used inline, before zooming. */
	height: number;
	/** Renders the chart. Called once inline and once more while zoomed. */
	children: (context: ZoomContext) => React.ReactNode;
}

const ZOOM_HEIGHT_RATIO = 0.7;
const MIN_ZOOM_HEIGHT = 320;

/**
 * Lets any chart open in a large dialog. The chart is rendered again at the
 * bigger height, so it keeps working the same way (tooltips, brush, filters).
 * Open with the corner button or by double-clicking the chart; close with
 * Esc, the backdrop, or the close button.
 */
const ZoomableChart: React.FC<ZoomableChartProps> = ({ title, height, children }) => {
	const [zoomed, setZoomed] = useState(false);
	const [zoomHeight, setZoomHeight] = useState(height);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);

	const open = useCallback(() => {
		setZoomHeight(Math.max(MIN_ZOOM_HEIGHT, Math.round(window.innerHeight * ZOOM_HEIGHT_RATIO)));
		setZoomed(true);
	}, []);
	const close = useCallback(() => {
		setZoomed(false);
		// Hand focus back to what opened the dialog.
		triggerRef.current?.focus();
	}, []);

	useEffect(() => {
		if (!zoomed) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};
		document.addEventListener("keydown", onKey);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		closeRef.current?.focus();
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = previousOverflow;
		};
	}, [zoomed, close]);

	const zoomButton = (
		<button
			ref={triggerRef}
			type="button"
			onClick={open}
			aria-label={`Zoom in on ${title}`}
			title="Zoom in (or double-click the chart)"
			className="rounded-md p-1.5 text-gray-700 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10"
		>
			<Maximize2 className="h-4 w-4" />
		</button>
	);

	return (
		<>
			<div onDoubleClick={open} className="cursor-zoom-in">
				{children({ height, zoomButton, zoomed: false })}
			</div>
			{zoomed &&
				createPortal(
					<div
						className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm md:p-8"
						onClick={close}
					>
						<div
							role="dialog"
							aria-modal="true"
							aria-label={title}
							onClick={(event) => event.stopPropagation()}
							className="max-h-full w-full max-w-7xl overflow-auto rounded-xl bg-white p-3 shadow-2xl dark:bg-gray-900 md:p-5"
						>
							<div className="mb-2 flex items-center justify-between gap-2">
								<h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
									{title}
								</h2>
								<button
									ref={closeRef}
									type="button"
									onClick={close}
									aria-label="Close zoomed chart"
									className="rounded-md p-1.5 text-gray-700 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
							{children({ height: zoomHeight, zoomButton: null, zoomed: true })}
						</div>
					</div>,
					document.body,
				)}
		</>
	);
};

export default ZoomableChart;

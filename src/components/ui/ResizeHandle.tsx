import React from "react";

interface ResizeHandleProps {
	onPointerDown: () => void;
	/** Which edge of the panel the handle sits on. Defaults to the right edge. */
	edge?: "left" | "right";
	label?: string;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
	onPointerDown,
	edge = "right",
	label = "Resize panel",
}) => (
	<div
		role="separator"
		aria-orientation="vertical"
		aria-label={label}
		onPointerDown={onPointerDown}
		className={`absolute top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-400/60 transition-colors z-10 touch-none ${
			edge === "right" ? "right-0 -mr-0.5" : "left-0 -ml-0.5"
		}`}
	/>
);

export default ResizeHandle;

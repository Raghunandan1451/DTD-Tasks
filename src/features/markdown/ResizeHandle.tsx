import React from "react";

interface ResizeHandleProps {
	onPointerDown: () => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onPointerDown }) => (
	<div
		role="separator"
		aria-orientation="vertical"
		onPointerDown={onPointerDown}
		className="absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-400/60 transition-colors z-10"
	/>
);

export default ResizeHandle;

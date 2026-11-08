import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import Button from "@src/components/ui/button/Button";

const SHORTCUTS: readonly (readonly [string, string])[] = [
	["Double-click canvas", "Add a note there"],
	["Double-click a node", "Edit its text"],
	["Enter / Esc", "Save / cancel an edit"],
	["Drag from a dot", "Connect two nodes"],
	["Shift + drag", "Select several"],
	["Ctrl/Cmd + click", "Add to selection"],
	["Delete / Backspace", "Delete selection"],
	["Ctrl/Cmd + C / V", "Copy / paste"],
	["Ctrl/Cmd + D", "Duplicate"],
	["Ctrl/Cmd + Z", "Undo"],
	["Ctrl/Cmd + Shift + Z", "Redo"],
];

const ShortcutsPopover: React.FC = () => {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: MouseEvent) => {
			if (!ref.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<Button
				aria-label="Keyboard shortcuts"
				aria-haspopup="true"
				aria-expanded={open}
				title="Shortcuts"
				onClick={() => setOpen((value) => !value)}
				className="rounded-md p-1.5 text-gray-700 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10"
			>
				<Keyboard className="h-4 w-4" />
			</Button>
			{open && (
				<div
					role="dialog"
					aria-label="Keyboard shortcuts"
					className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-white/20 bg-white/90 p-3 text-xs shadow-lg backdrop-blur-md dark:bg-gray-900/95"
				>
					<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
						{SHORTCUTS.map(([keys, action]) => (
							<div key={keys} className="contents">
								<dt className="font-semibold text-gray-800 dark:text-gray-100">{keys}</dt>
								<dd className="text-gray-600 dark:text-gray-300">{action}</dd>
							</div>
						))}
					</dl>
				</div>
			)}
		</div>
	);
};

export default ShortcutsPopover;

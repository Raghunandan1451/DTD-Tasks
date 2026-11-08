import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { Section, SECTIONS } from "@src/features/home/lib/types";
import { SECTION_META } from "@src/features/home/lib/constants";

interface DownloadMenuProps {
	selected: Set<Section>;
	isDataLoaded: Record<Section, boolean>;
	stats: Record<Section, string | number>;
	isDownloading: boolean;
	buttonText: string;
	onToggle: (section: Section) => void;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onDownload: () => void;
}

const DownloadMenu: React.FC<DownloadMenuProps> = ({
	selected,
	isDataLoaded,
	stats,
	isDownloading,
	buttonText,
	onToggle,
	onSelectAll,
	onDeselectAll,
	onDownload,
}) => {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
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
		<div ref={containerRef} className="relative flex gap-2 items-center">
			<Button
				type="button"
				className="btn-primary text-xs md:text-base py-1.5 md:py-2 px-2.5 md:px-4"
				onClick={onDownload}
				text={buttonText}
				disabled={isDownloading || selected.size === 0}
			/>
			<Button
				type="button"
				aria-label="Choose sections to download"
				aria-haspopup="true"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
				className="btn-secondary py-1.5 md:py-2 px-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
			>
				<ChevronDown
					className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
				/>
			</Button>

			{open && (
				<div
					role="group"
					aria-label="Sections to download"
					className="absolute right-0 top-full mt-2 z-30 w-64 rounded-xl border border-white/20 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md shadow-lg p-3"
				>
					{SECTIONS.map((section) => (
						<label
							key={section}
							className="flex items-center gap-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer"
						>
							<input
								type="checkbox"
								checked={selected.has(section)}
								onChange={() => onToggle(section)}
								className="accent-cyan-500"
							/>
							<span className="flex-1">
								{SECTION_META[section].label}
							</span>
							<span className="text-xs text-gray-500 dark:text-gray-400">
								{isDataLoaded[section]
									? stats[section]
									: "not loaded"}
							</span>
						</label>
					))}
					<div className="mt-2 flex gap-3">
						<Button
							type="button"
							onClick={onSelectAll}
							text="Select all"
							className="text-xs underline underline-offset-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
						/>
						<Button
							type="button"
							onClick={onDeselectAll}
							text="Deselect all"
							className="text-xs underline underline-offset-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default DownloadMenu;

import React from "react";
import { Section, SECTIONS } from "@src/features/home/lib/types";
import { SECTION_META } from "@src/features/home/lib/constants";

interface SectionCardsProps {
	selected: Set<Section>;
	isDataLoaded: Record<Section, boolean>;
	stats: Record<Section, string | number>;
	onToggle: (section: Section) => void;
	onSelectAll: () => void;
	onDeselectAll: () => void;
}

const SectionCards: React.FC<SectionCardsProps> = ({
	selected,
	isDataLoaded,
	stats,
	onToggle,
	onSelectAll,
	onDeselectAll,
}) => (
	<div className="flex flex-col items-center w-full">
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
			{SECTIONS.map((section) => {
				const meta = SECTION_META[section];
				const isSelected = selected.has(section);
				const isLoaded = isDataLoaded[section];

				return (
					<div
						key={section}
						onClick={() => onToggle(section)}
						className={`
							relative cursor-pointer rounded-xl border bg-gradient-to-br p-5
							backdrop-blur-sm transition-all duration-200 select-none
							${meta.color}
							${
								isSelected
									? "ring-2 ring-white/40 shadow-lg scale-[1.02]"
									: "opacity-50 hover:opacity-70"
							}
						`}
					>
						{/* Checkbox indicator */}
						<div
							className={`
								absolute top-3 right-3 w-5 h-5 rounded-full border-2
								flex items-center justify-center transition-colors duration-200
								${isSelected ? "bg-white/90 border-white/90" : "border-white/30 bg-transparent"}
							`}
						>
							{isSelected && (
								<svg
									className="w-3 h-3 text-gray-800"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={3}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							)}
						</div>

						{/* Loaded indicator */}
						{isLoaded && (
							<div className="absolute top-3 left-3">
								<span className="text-xs text-green-400">
									●
								</span>
							</div>
						)}

						<div className="mt-2">
							<h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">
								{meta.label}
							</h3>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">
								{stats[section]}
							</p>
						</div>
					</div>
				);
			})}
		</div>

		{/* Select / Deselect all */}
		<div className="mt-6 flex gap-3">
			<button
				onClick={onSelectAll}
				className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors underline underline-offset-2"
			>
				Select all
			</button>
			<span className="text-gray-400">·</span>
			<button
				onClick={onDeselectAll}
				className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors underline underline-offset-2"
			>
				Deselect all
			</button>
		</div>
	</div>
);

export default SectionCards;

import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@src/components/ui/button/Button";

interface ControlBarProps {
	dateLabel: string;
	viewMode: "daily" | "weekly";
	isMobile: boolean;
	onNavigate: (direction: "prev" | "next") => void;
	onViewModeChange: (mode: "daily" | "weekly") => void;
	onAddEvent: () => void;
}

const ControlBar = ({
	dateLabel,
	viewMode,
	isMobile,
	onNavigate,
	onViewModeChange,
	onAddEvent,
}: ControlBarProps) => {
	return (
		<div className="backdrop-blur-sm rounded-xl p-1">
			<div className="flex flex-col md:flex-row justify-between items-center gap-3">
				{/* Navigation */}
				<div className="flex items-center gap-3">
					<Button
						onClick={() => onNavigate("prev")}
						className="p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-400/50 rounded-lg transition-colors"
					>
						<ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
					</Button>
					<Button
						onClick={() => onNavigate("next")}
						className="p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-400/50 rounded-lg transition-colors"
					>
						<ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
					</Button>

					<h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
						{dateLabel}
					</h2>
				</div>

				{/* View Controls */}
				<div className="flex items-center gap-2">
					{!isMobile && (
						<div className="flex bg-gray-100/50 dark:bg-gray-700 rounded-lg p-0.5">
							<Button
								onClick={() => onViewModeChange("daily")}
								className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
									viewMode === "daily"
										? "bg-white/70 dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
										: "text-gray-600 dark:text-gray-300"
								}`}
							>
								Daily
							</Button>
							{!isMobile && (
								<Button
									onClick={() => onViewModeChange("weekly")}
									className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
										viewMode === "weekly"
											? "bg-white/70 dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
											: "text-gray-600 dark:text-gray-300"
									}`}
								>
									Weekly
								</Button>
							)}
						</div>
					)}

					<Button
						onClick={onAddEvent}
						className="bg-green-400 dark:bg-green-600 hover:bg-green-500 dark:hover:bg-green-500 text-gray-800 dark:text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Add Event
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ControlBar;

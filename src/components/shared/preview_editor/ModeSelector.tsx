import { Edit2Icon, EyeIcon, SplitSquareVerticalIcon } from "lucide-react";
import Button from "@src/components/ui/button/Button";

export type EditorMode = "edit" | "preview" | "split";

interface ModeSelectorProps {
	currentMode: EditorMode;
	allowedModes: EditorMode[];
	onModeChange: (mode: EditorMode) => void;
	className?: string;
}

const ModeSelector = ({
	currentMode,
	allowedModes,
	onModeChange,
	className = "",
}: ModeSelectorProps) => {
	if (allowedModes.length <= 1) return null;

	const modeConfig = {
		edit: { icon: Edit2Icon, label: "Edit", ariaLabel: "Edit mode" },
		preview: { icon: EyeIcon, label: "Preview", ariaLabel: "Preview mode" },
		split: {
			icon: SplitSquareVerticalIcon,
			label: "Split",
			ariaLabel: "Split view mode",
		},
	};

	return (
		<div
			className={`flex gap-1 bg-gray-700/50 rounded-lg p-1 ${className}`}
		>
			{allowedModes.map((mode) => {
				const IconComponent = modeConfig[mode].icon;
				return (
					<Button
						key={mode}
						onClick={() => onModeChange(mode)}
						className={`flex items-center p-2 rounded transition-colors ${
							currentMode === mode
								? "bg-blue-600 text-white"
								: "text-gray-300 hover:bg-gray-600"
						}`}
						type="button"
						aria-label={modeConfig[mode].ariaLabel}
						title={modeConfig[mode].label}
					>
						<IconComponent className="h-5 w-5" />
						{/* Responsive text - hidden on small screens */}
						<span className="ml-1.5 text-sm hidden sm:inline">
							{modeConfig[mode].label}
						</span>
					</Button>
				);
			})}
		</div>
	);
};

export default ModeSelector;

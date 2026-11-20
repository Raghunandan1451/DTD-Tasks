// src/components/expenses/Controls.tsx

import { FC } from "react";
import Button from "@src/components/ui/button/Button";
import clsx from "clsx";
import { ControlsProps, ViewMode } from "@src/features/finance/type";

const views: { key: ViewMode; label: string }[] = [
	{ key: "salary", label: "Overview" },
	{ key: "list", label: "Expenses" },
	{ key: "budget", label: "Budget Planning" },
];

const Controls: FC<ControlsProps> = ({ viewMode, onChangeView, locked }) => {
	const baseStyles =
		"backdrop-blur-md transition-colors duration-300 rounded-md text-sm font-medium px-3 py-1.5 cursor-pointer border";

	return (
		<div className="flex flex-wrap justify-evenly gap-2 pt-2">
			{views.map(({ key, label }) => {
				const isLocked = !!locked && key !== "salary";
				return (
					<Button
						key={key}
						disabled={isLocked}
						title={
							isLocked
								? "Set your salary and balance in Overview first"
								: undefined
						}
						onClick={() => onChangeView(key)}
						className={clsx(
							baseStyles,
							key === viewMode ? "btn-glass-selected" : "btn-glass-unselected",
							isLocked && "opacity-50 cursor-not-allowed",
						)}
						text={label}
					/>
				);
			})}
		</div>
	);
};
export default Controls;

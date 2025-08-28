// src/components/expenses/Controls.tsx

import { FC } from "react";
import Button from "@src/components/ui/button/Button";
import clsx from "clsx";
import { ControlsProps, ViewMode } from "@src/lib/types/finance";

const views: { key: ViewMode; label: string }[] = [
	{ key: "salary", label: "Salary & Recurring" },
	{ key: "list", label: "Expenses" },
	{ key: "estimate", label: "Estimator" },
	{ key: "graph", label: "Graphs" },
];

const Controls: FC<ControlsProps> = ({ viewMode, onChangeView }) => {
	const baseStyles =
		"backdrop-blur-md transition-colors duration-300 rounded-md text-sm font-medium px-3 py-1.5 cursor-pointer border";

	return (
		<div className="flex flex-wrap justify-evenly gap-2 pt-2">
			{views.map(({ key, label }) => (
				<Button
					key={key}
					onClick={() => onChangeView(key)}
					className={clsx(
						baseStyles,
						key === viewMode
							? "btn-glass-selected"
							: "btn-glass-unselected"
					)}
					text={label}
				/>
			))}
		</div>
	);
};
export default Controls;

import { FC } from "react";
import { ExpenseEntry } from "@src/features/finance/type";

interface TypeBadgeProps {
	type: ExpenseEntry["type"];
}

/** Read-only Dr/Cr pill badge. Extracted from ExpenseRow.tsx -- never editable. */
const TypeBadge: FC<TypeBadgeProps> = ({ type }) => (
	<div
		className={`text-xs font-semibold text-center px-2 py-1 rounded-full ${
			type === "Cr"
				? "bg-green-500/20 text-green-700"
				: "bg-red-500/20 text-red-700"
		}`}
	>
		{type || "Dr"}
	</div>
);

export default TypeBadge;

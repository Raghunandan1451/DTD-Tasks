import { useContext } from "react";
import TableContext, { TableContextType } from "@src/lib/context/TableContext";

// Custom hook for consuming TableContext
export const useTableContext = (): TableContextType => {
	const context = useContext(TableContext);
	if (!context) {
		throw new Error("useTableContext must be used within a TableProvider");
	}
	return context;
};

import { createContext, useContext } from 'react';

// Create Table Context
const TableContext = createContext();

// Provider component
export const TableProvider = ({ children, value }) => {
	return (
		<TableContext.Provider value={value}>{children}</TableContext.Provider>
	);
};

// Hook to use context
export const useTableContext = () => useContext(TableContext);

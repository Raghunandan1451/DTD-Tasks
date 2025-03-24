import {
	ReactNode,
	Dispatch,
	SetStateAction,
	RefObject,
	createContext,
} from 'react';

// Define the context type
export interface TableContextType {
	handleCellDataChange: (
		uniqueId: string,
		columnKey: string,
		newValue: string
	) => void;
	activeCell: { row: number; col: number };
	setActiveCell: Dispatch<SetStateAction<{ row: number; col: number }>>;
	inputRefs: RefObject<{
		[key: string]: HTMLDivElement | HTMLSelectElement | null;
	}>; // Assuming a 2D array for table inputs
	cellRef: RefObject<HTMLTableSectionElement | null>;
	showNotification: (
		message: string,
		type?: 'success' | 'error' | 'warning'
	) => void;
}

// Provider component with props typing
interface TableProviderProps {
	children: ReactNode;
	value: TableContextType;
}

// Create Table Context with default value as undefined
const TableContext = createContext<TableContextType | null>(null);

export const TableProvider: React.FC<TableProviderProps> = ({
	children,
	value,
}) => {
	return (
		<TableContext.Provider value={value}>{children}</TableContext.Provider>
	);
};

export default TableContext;

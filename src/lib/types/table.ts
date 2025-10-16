import React from "react";

export type CellPosition = {
	row: number;
	col: number;
};

export type TableContextType = {
	handleCellDataChange: (uid: string, key: string, value: string) => void;
	setActiveCell: (position: CellPosition) => void;
	inputRefs: React.RefObject<{ [key: string]: HTMLInputElement | null }>;
};

export interface BaseCellProps {
	column: {
		key: string;
		options?: string[];
	};
	row: {
		uid: string;
		[key: string]: string | number | Date | undefined;
	};
	rowIndex: number;
	colIndex: number;
}

export interface Column {
	key: string;
	type: string;
	header: string;
	className?: string;
	options?: string[];
}

export interface RowData {
	uid: string;
	[key: string]: string | undefined;
}

export interface DeleteParams {
	uid: string;
	length: number;
}
export interface ColumnConfig<T> {
	key: string;
	label: string;
	width: string;
	render: (
		item: T,
		isEditing: boolean,
		editForm: T | null,
		handlers: TableHandlers<T>
	) => React.ReactNode;
	editable?: boolean;
}

export interface TableHandlers<T> {
	handleEditChange: (field: keyof T, value: string | number) => void;
	handleKeyDown: (e: React.KeyboardEvent) => void;
	handleSaveEdit: () => void;
	handleCancelEdit: () => void;
	handleStartEdit: (item: T) => void;
	handleDelete: (id: string, name: string, isProtected?: boolean) => void;
	displayQuantity?: (quantity: number, unit: string) => string;
}

export interface TableRowRef {
	current: HTMLTableRowElement | null;
}

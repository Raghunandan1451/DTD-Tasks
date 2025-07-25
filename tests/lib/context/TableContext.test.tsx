import React, { useContext } from "react";
import { render, screen } from "@testing-library/react";
import TableContext, {
	TableProvider,
	TableContextType,
} from "@src/lib/context/TableContext"; // adjust path as needed
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

// A dummy component that consumes the TableContext and displays a text based on a property.
const DummyComponent: React.FC = () => {
	const context = useContext(TableContext);
	return (
		<div data-testid="dummy">
			{context
				? `Active Cell: ${context.activeCell.row}, ${context.activeCell.col}`
				: "No context"}
		</div>
	);
};

describe("TableContext", () => {
	it("provides context value to descendants", () => {
		// Create a dummy value conforming to TableContextType.
		const dummyValue: TableContextType = {
			handleCellDataChange: (
				_uniqueId: string,
				_columnKey: string,
				_newValue: string
			) => {},
			activeCell: { row: 1, col: 2 },
			setActiveCell: () => {},
			inputRefs: { current: {} },
			cellRef: { current: null },
			showNotification: (
				_message: string,
				_type: "success" | "error" | "info"
			) => {},
		};

		render(
			<TableProvider value={dummyValue}>
				<DummyComponent />
			</TableProvider>
		);

		expect(screen.getByTestId("dummy")).toHaveTextContent(
			"Active Cell: 1, 2"
		);
	});

	it("renders children correctly", () => {
		render(
			<TableProvider
				value={{
					handleCellDataChange: () => {},
					activeCell: { row: 0, col: 0 },
					setActiveCell: () => {},
					inputRefs: { current: {} },
					cellRef: { current: null },
					showNotification: () => {},
				}}
			>
				<div data-testid="child">Child Component</div>
			</TableProvider>
		);
		expect(screen.getByTestId("child")).toHaveTextContent(
			"Child Component"
		);
	});
});

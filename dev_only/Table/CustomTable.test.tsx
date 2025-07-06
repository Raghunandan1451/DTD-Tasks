import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomTable from "./CustomTable";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import * as hookModule from "../../src/hooks/useHandleTableKeyEvent";

// Dummy columns and data for testing.
const columns = [
	{ key: "uid", header: "ID", className: "" },
	{ key: "name", header: "Name", className: "", type: "text" },
];
const data = [
	{ uid: "1", name: "Alice" },
	{ uid: "2", name: "Bob" },
];

// Spies for the callback props.
const onAddRow = vi.fn();
const onUpdate = vi.fn();
const onDeleteRow = vi.fn();
const showNotification = vi.fn();

// Mock the useHandleTableKeyEvent hook so that it returns a spy function.
const mockHandleTableKeyEvent = vi.fn();
vi.spyOn(hookModule, "useHandleTableKeyEvent").mockReturnValue(
	mockHandleTableKeyEvent
);

describe("CustomTable Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders table header and rows", () => {
		const { container } = render(
			<CustomTable
				columns={columns}
				data={data}
				onAddRow={onAddRow}
				onUpdate={onUpdate}
				onDeleteRow={onDeleteRow}
				showNotification={showNotification}
			/>
		);

		expect(screen.getByText("ID")).toBeInTheDocument();
		expect(screen.getByText("Name")).toBeInTheDocument();

		const rows = container.querySelectorAll("tbody tr");
		expect(rows.length).toBeGreaterThanOrEqual(data.length);
	});

	it("calls the key event handler on keyDown event", () => {
		render(
			<CustomTable
				columns={columns}
				data={data}
				onAddRow={onAddRow}
				onUpdate={onUpdate}
				onDeleteRow={onDeleteRow}
				showNotification={showNotification}
			/>
		);

		// Select the container div that has tabIndex=0
		const containerDiv = screen.getByRole("table").parentElement!;
		expect(containerDiv).toBeInTheDocument();

		// Now simulate keyDown
		fireEvent.keyDown(containerDiv, { key: "Enter", code: "Enter" });

		expect(mockHandleTableKeyEvent).toHaveBeenCalled();
	});

	it("calls onUpdate when a cell value changes", () => {
		render(
			<CustomTable
				columns={columns}
				data={data}
				onAddRow={onAddRow}
				onUpdate={onUpdate}
				onDeleteRow={onDeleteRow}
				showNotification={showNotification}
			/>
		);

		const input = screen.getByDisplayValue("Alice");
		fireEvent.change(input, { target: { value: "Alicia" } });
		fireEvent.blur(input); // Assuming update happens on blur or enter

		expect(onUpdate).toHaveBeenCalledWith("1", "name", "Alicia");
	});
});

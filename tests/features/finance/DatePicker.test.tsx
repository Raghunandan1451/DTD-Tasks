import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import expensesReducer from "@src/lib/store/slices/expensesSlice";
import financeReducer from "@src/lib/store/slices/financeSlice";
import DatePickerPopover from "@src/features/finance/expense_list/DatePickerPopover";
import ExpenseNavigation from "@src/features/finance/expense_list/ExpenseNavigation";
import type { ExpenseEntry } from "@src/features/finance/type";

const TODAY = "2026-10-28";

const makeStore = (
	expenses: ExpenseEntry[] = [],
	selectedDate: string = TODAY,
) =>
	configureStore({
		reducer: { expenses: expensesReducer, finance: financeReducer },
		preloadedState: {
			expenses: { expenses, selectedDate, loaded: true },
		},
	});

const expense = (
	date: string,
	amount: number,
	type: "Dr" | "Cr" = "Dr",
): ExpenseEntry => ({
	id: `${date}-${type}`,
	date,
	amount,
	type,
	group: "Food",
	name: "item",
});

const cell = (iso: string) =>
	document.querySelector<HTMLButtonElement>(`[data-iso="${iso}"]`)!;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(2026, 9, 28, 12));
});
afterEach(() => vi.useRealTimers());

describe("DatePickerPopover", () => {
	const renderPicker = (
		expenses: ExpenseEntry[] = [],
		selectedDate = TODAY,
	) => {
		const onSelect = vi.fn();
		const onClose = vi.fn();
		render(
			<Provider store={makeStore(expenses)}>
				<DatePickerPopover
					selectedDate={selectedDate}
					onSelect={onSelect}
					onClose={onClose}
				/>
			</Provider>,
		);
		return { onSelect, onClose };
	};

	it("shows the selected month with each day's spend", () => {
		renderPicker([
			expense("2026-10-05", 1234),
			expense("2026-10-06", 500, "Cr"),
		]);

		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(screen.getByRole("grid").getAttribute("aria-label")).toBe(
			"October 2026",
		);
		expect(cell("2026-10-05").textContent).toContain("1.2k");
		expect(cell("2026-10-05").getAttribute("aria-label")).toContain(
			"spent 1234.00",
		);
		expect(cell("2026-10-06").getAttribute("aria-label")).toContain(
			"received 500.00",
		);
		expect(cell(TODAY).getAttribute("aria-selected")).toBe("true");
	});

	it("disables future days and the next-month button in the current month", () => {
		renderPicker();
		expect(cell("2026-10-29").disabled).toBe(true);
		expect(cell(TODAY).disabled).toBe(false);
		expect(
			(screen.getByLabelText("Next month") as HTMLButtonElement).disabled,
		).toBe(true);
	});

	it("goes back a month and selects a day", () => {
		const { onSelect, onClose } = renderPicker();
		fireEvent.click(screen.getByLabelText("Previous month"));
		expect(screen.getByRole("grid").getAttribute("aria-label")).toBe(
			"September 2026",
		);
		fireEvent.click(cell("2026-09-15"));
		expect(onSelect).toHaveBeenCalledWith("2026-09-15");
		expect(onClose).toHaveBeenCalled();
	});

	it("jumps to a month and year through the month grid", () => {
		renderPicker();
		fireEvent.click(screen.getByLabelText("Choose month and year"));
		fireEvent.click(screen.getByLabelText("Previous year"));
		fireEvent.click(screen.getByText("Mar"));
		expect(screen.getByRole("grid").getAttribute("aria-label")).toBe(
			"March 2025",
		);
	});

	it("disables months after the current one", () => {
		renderPicker();
		fireEvent.click(screen.getByLabelText("Choose month and year"));
		expect((screen.getByText("Oct") as HTMLButtonElement).disabled).toBe(false);
		expect((screen.getByText("Nov") as HTMLButtonElement).disabled).toBe(true);
		expect(
			(screen.getByLabelText("Next year") as HTMLButtonElement).disabled,
		).toBe(true);
	});

	it("offers Today, Yesterday and Start of month shortcuts", () => {
		const { onSelect } = renderPicker([], "2026-09-10");
		fireEvent.click(screen.getByText("Today"));
		fireEvent.click(screen.getByText("Yesterday"));
		fireEvent.click(screen.getByText("Start of month"));
		expect(onSelect.mock.calls.map(([iso]) => iso)).toEqual([
			TODAY,
			"2026-10-27",
			"2026-09-01",
		]);
	});

	it("moves focus with arrow keys and never past today", () => {
		renderPicker();
		const grid = screen.getByRole("grid");
		expect(document.activeElement).toBe(cell(TODAY));

		fireEvent.keyDown(grid, { key: "ArrowLeft" });
		expect(document.activeElement).toBe(cell("2026-10-27"));
		fireEvent.keyDown(grid, { key: "ArrowUp" });
		expect(document.activeElement).toBe(cell("2026-10-20"));
		fireEvent.keyDown(grid, { key: "ArrowDown" });
		fireEvent.keyDown(grid, { key: "ArrowDown" });
		expect(document.activeElement).toBe(cell(TODAY));
	});

	it("PageUp moves to the previous month", () => {
		renderPicker();
		fireEvent.keyDown(screen.getByRole("grid"), { key: "PageUp" });
		expect(screen.getByRole("grid").getAttribute("aria-label")).toBe(
			"September 2026",
		);
		expect(document.activeElement).toBe(cell("2026-09-28"));
	});

	it("closes on Escape", () => {
		const { onClose } = renderPicker();
		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
		expect(onClose).toHaveBeenCalled();
	});
});

describe("ExpenseNavigation", () => {
	const renderNav = (selectedDate = TODAY, expenses: ExpenseEntry[] = []) => {
		const store = makeStore(expenses, selectedDate);
		render(
			<Provider store={store}>
				<ExpenseNavigation />
			</Provider>,
		);
		return store;
	};
	const selected = (store: ReturnType<typeof makeStore>) =>
		store.getState().expenses.selectedDate;
	const disabled = (label: string) =>
		(screen.getByLabelText(label) as HTMLButtonElement).disabled;

	it("steps by day and month, and disables forward steps at today", () => {
		const store = renderNav();
		expect(disabled("Next day")).toBe(true);
		expect(disabled("Next month")).toBe(true);
		expect(screen.queryByText("Today")).toBeNull();

		fireEvent.click(screen.getByLabelText("Previous day"));
		expect(selected(store)).toBe("2026-10-27");
		fireEvent.click(screen.getByLabelText("Previous month"));
		expect(selected(store)).toBe("2026-09-27");
		expect(disabled("Next month")).toBe(false);
	});

	it("shows a Today chip away from today and returns to today", () => {
		const store = renderNav("2026-07-04");
		fireEvent.click(screen.getByText("Today"));
		expect(selected(store)).toBe(TODAY);
		expect(screen.queryByText("Today")).toBeNull();
	});

	it("picks a day from the popover, closing it afterwards", () => {
		const store = renderNav();
		fireEvent.click(screen.getByLabelText("Pick a date"));
		const dialog = screen.getByRole("dialog");

		fireEvent.click(within(dialog).getByLabelText("Previous month"));
		fireEvent.click(cell("2026-09-15"));

		expect(selected(store)).toBe("2026-09-15");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("closes the popover on an outside click but not an inside one", () => {
		renderNav();
		fireEvent.click(screen.getByLabelText("Pick a date"));
		fireEvent.mouseDown(screen.getByRole("dialog"));
		expect(screen.getByRole("dialog")).toBeTruthy();
		fireEvent.mouseDown(document.body);
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});

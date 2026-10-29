import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import expensesReducer from "@src/lib/store/slices/expensesSlice";
import financeReducer from "@src/lib/store/slices/financeSlice";
import { useFinanceUploadHandler } from "@src/features/finance/hooks/useFinanceUploadHandler";
import { buildFinanceBackup } from "@src/features/finance/lib/financeBackup";
import { UploadError } from "@src/lib/utils/uploadError";
import type { ExpenseEntry } from "@src/features/finance/type";

const entry = (id: string): ExpenseEntry => ({
	id,
	date: "2026-10-01",
	name: id,
	group: "Food",
	amount: 5,
	type: "Dr",
});

const financeData = {
	salary: { amount: 1000, dayOfMonth: 5 },
	currentBalance: 250,
	manualOverride: true,
	groups: ["Food", "Travel"],
	loaded: false,
};

// jsdom's File has no text(); browsers do
const file = (name: string, content: unknown) => {
	const text = typeof content === "string" ? content : JSON.stringify(content);
	return Object.assign(new File([text], name, { type: "application/json" }), {
		text: async () => text,
	});
};

const setup = () => {
	const store = configureStore({
		reducer: { expenses: expensesReducer, finance: financeReducer },
	});
	const wrapper = ({ children }: { children: ReactNode }) => (
		<Provider store={store}>{children}</Provider>
	);
	const { result } = renderHook(() => useFinanceUploadHandler(), { wrapper });
	return { store, upload: result.current };
};

describe("useFinanceUploadHandler", () => {
	it("restores both slices from one combined file", async () => {
		const { store, upload } = setup();
		const backup = buildFinanceBackup(financeData, {
			expenses: [entry("a"), entry("b")],
			selectedDate: "2026-10-01",
			loaded: true,
		});

		const message = await upload([file("finance-backup.json", backup)]);

		expect(store.getState().expenses.expenses).toHaveLength(2);
		expect(store.getState().finance.currentBalance).toBe(250);
		expect(message).toBe("Restored 2 expenses and finance settings");
	});

	it("restores both legacy files picked together, in any order", async () => {
		const { store, upload } = setup();

		await upload([
			file("expenses-data.json", {
				expenses: [entry("a")],
				selectedDate: "2026-10-01",
				loaded: true,
			}),
			file("finance-data.json", financeData),
		]);

		expect(store.getState().expenses.expenses).toHaveLength(1);
		expect(store.getState().finance.groups).toEqual(["Food", "Travel"]);
	});

	it("restores a single legacy file on its own", async () => {
		const { store, upload } = setup();
		const message = await upload([file("whatever.json", financeData)]);

		expect(message).toBe("Restored finance settings");
		expect(store.getState().finance.currentBalance).toBe(250);
		expect(store.getState().expenses.expenses).toEqual([]);
	});

	it("detects the file type from content, not from the filename", async () => {
		const { store, upload } = setup();
		await upload([
			file("finance-data.json", {
				expenses: [entry("a")],
				selectedDate: "2026-10-01",
				loaded: true,
			}),
		]);
		expect(store.getState().expenses.expenses).toHaveLength(1);
	});

	it("reports skipped entries in the success message", async () => {
		const { upload } = setup();
		const message = await upload([
			file("e.json", {
				expenses: [entry("a"), { broken: true }],
				selectedDate: "2026-10-01",
				loaded: true,
			}),
		]);
		expect(message).toBe("Restored 1 expenses (1 invalid entries skipped)");
	});

	it("rejects an unrelated JSON file with a clear error and changes nothing", async () => {
		const { store, upload } = setup();
		const before = store.getState();

		await expect(
			upload([file("calendar-data.json", { events: [] })]),
		).rejects.toThrow(UploadError);
		expect(store.getState()).toEqual(before);
	});

	it("restores nothing when any one of several files is bad", async () => {
		const { store, upload } = setup();
		const before = store.getState();

		await expect(
			upload([file("finance-data.json", financeData), file("bad.json", "{nope")]),
		).rejects.toThrow("bad.json is not valid JSON");
		expect(store.getState()).toEqual(before);
	});
});

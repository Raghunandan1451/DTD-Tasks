import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { describe, expect, it } from "vitest";
import BudgetPlanner from "@src/features/finance/budget_planning/BudgetPlanner";
import {
	BudgetCategory,
	ExpenseEntry,
} from "@src/features/finance/type";
import financeReducer, {
	setBudgetPlanForMonth,
} from "@src/lib/store/slices/financeSlice";
import { DEFAULT_BUDGET_CATEGORIES } from "@src/features/finance/lib/budgetCategories";

const currentMonth = format(new Date(), "yyyy-MM");
const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");
const ledgerExpenses: ExpenseEntry[] = [
	{
		id: "market-1",
		date: `${currentMonth}-08`,
		name: "Groceries",
		group: "Food",
		amount: 125.5,
		type: "Dr",
	},
	{
		id: "market-2",
		date: `${lastMonth}-12`,
		name: "Last month's bill",
		group: "Utilities",
		amount: 80,
		type: "Dr",
	},
	{
		id: "salary-1",
		date: `${currentMonth}-01`,
		name: "Salary",
		group: "Salary",
		amount: 5000,
		type: "Cr",
	},
];

const BudgetPlannerHarness = ({
	expenses = ledgerExpenses,
}: {
	expenses?: ExpenseEntry[];
}) => {
	const [plans, setPlans] = useState<
		Record<string, BudgetCategory[]>
	>({});

	return (
		<BudgetPlanner
			monthlyIncome={5000}
			legacyCategories={DEFAULT_BUDGET_CATEGORIES}
			plansByMonth={plans}
			onPlanChange={(month, categories) =>
				setPlans((previous) => ({ ...previous, [month]: categories }))
			}
			expenses={expenses}
		/>
	);
};

describe("BudgetPlanner", () => {
	it("uses the default 50/30/20 plan and shows allocation in each category column", () => {
		render(<BudgetPlannerHarness />);

		expect(screen.getByText("2,500.00")).toBeTruthy();
		expect(screen.getByText("1,500.00")).toBeTruthy();
		expect(screen.getByText("1,000.00")).toBeTruthy();
		expect(screen.queryByText("Monthly Income Allocation")).toBeNull();
		expect(screen.queryByText("Unallocated")).toBeNull();
	});

	it("supports custom splits and warns when the allocation is below 100%", () => {
		render(<BudgetPlannerHarness />);

		const editAllocation = (categoryName: string, percentage: string) => {
			fireEvent.click(
				screen.getByRole("button", {
					name: `Edit ${categoryName}`,
				}),
			);
			fireEvent.change(
				screen.getByLabelText("Allocation percentage"),
				{ target: { value: percentage } },
			);
			fireEvent.click(
				screen.getByRole("button", { name: "Save Changes" }),
			);
		};
		editAllocation("Needs", "70");
		editAllocation("Wants", "20");
		editAllocation("Savings", "5");

		expect(screen.getByText("3,500.00")).toBeTruthy();
		expect(screen.getByText("1,000.00")).toBeTruthy();
		expect(screen.getByText("250.00")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toContain(
			"5.0% unallocated",
		);
	});

	it("fills available width automatically and edits the name and percentage in the category modal", () => {
		render(<BudgetPlannerHarness />);

		const columns = screen.getByLabelText(
			`${format(new Date(), "MMMM yyyy")} budget categories`,
		);
		expect(columns.getAttribute("style")).toContain("auto-fit");
		expect(screen.queryByRole("slider")).toBeNull();
		expect(screen.queryByLabelText("Category name")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Edit Needs" }));
		const categoryName = screen.getByLabelText("Category name");
		const allocation = screen.getByLabelText("Allocation percentage");
		expect((categoryName as HTMLInputElement).value).toBe("Needs");
		expect((allocation as HTMLInputElement).value).toBe("50");
		fireEvent.change(categoryName, { target: { value: "Essentials" } });
		fireEvent.change(allocation, { target: { value: "55" } });
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
		expect(screen.getByText("Essentials")).toBeTruthy();
		expect(screen.getByText("55%")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Add category" }));
		expect(screen.getByLabelText("Category name")).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Category name"), {
			target: { value: "Travel" },
		});
		fireEvent.change(screen.getByLabelText("Allocation percentage"), {
			target: { value: "10" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
		expect(screen.getByText("Travel")).toBeTruthy();
		expect(screen.getByText("10%")).toBeTruthy();
	});

	it("selects ledger expenses for the displayed month only", () => {
		render(<BudgetPlannerHarness />);

		fireEvent.click(screen.getAllByRole("button", { name: "Add expense" })[0]);
		expect(screen.getByRole("button", { name: /Groceries/ })).toBeTruthy();
		expect(screen.queryByText("Last month's bill")).toBeNull();
		expect(screen.queryByText("Salary")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: /Groceries/ }));
		expect(screen.getByText("Groceries")).toBeTruthy();
		expect(screen.getAllByText("125.50")).toHaveLength(1);
	});

	it("requires confirmation before deleting a category", async () => {
		render(<BudgetPlannerHarness />);

		fireEvent.click(screen.getByRole("button", { name: "Remove Needs" }));
		expect(
			screen.getByRole("heading", { name: "Delete Category" }),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.getByText("Needs")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Remove Needs" }));
		fireEvent.click(screen.getByRole("button", { name: "Delete" }));
		await waitFor(() => expect(screen.queryByText("Needs")).toBeNull());
	});

	it("keeps a separate allocation plan for each month", () => {
		render(<BudgetPlannerHarness />);

		fireEvent.click(screen.getByRole("button", { name: "Edit Needs" }));
		fireEvent.change(screen.getByLabelText("Allocation percentage"), {
			target: { value: "60" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
		fireEvent.click(
			screen.getByRole("button", { name: "Previous budget month" }),
		);
		expect(screen.getByText("50%")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Edit Needs" }));
		fireEvent.change(screen.getByLabelText("Allocation percentage"), {
			target: { value: "40" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

		fireEvent.click(
			screen.getByRole("button", { name: "Next budget month" }),
		);
		expect(screen.getByText("60%")).toBeTruthy();
	});

	it("stores monthly plans independently in finance state", () => {
		const initialState = financeReducer(undefined, { type: "test/init" });
		const firstMonth = DEFAULT_BUDGET_CATEGORIES.map((category) => ({
			...category,
			percentage: 60,
		}));
		const secondMonth = DEFAULT_BUDGET_CATEGORIES.map((category) => ({
			...category,
			percentage: 40,
		}));

		const firstUpdate = financeReducer(
			initialState,
			setBudgetPlanForMonth({
				month: currentMonth,
				categories: firstMonth,
			}),
		);
		const secondUpdate = financeReducer(
			firstUpdate,
			setBudgetPlanForMonth({
				month: format(addMonths(new Date(), 1), "yyyy-MM"),
				categories: secondMonth,
			}),
		);

		expect(secondUpdate.budgetPlansByMonth?.[currentMonth]).toEqual(
			firstMonth,
		);
		expect(
			secondUpdate.budgetPlansByMonth?.[
				format(addMonths(new Date(), 1), "yyyy-MM")
			],
		).toEqual(secondMonth);
	});
});

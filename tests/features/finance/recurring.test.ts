import { describe, expect, it, vi } from "vitest";
import type { RecurringItem } from "@src/features/finance/type";
import {
	describeSchedule,
	dueDates,
	monthlyEquivalent,
	nextDueDate,
	planRecurringPostings,
	unpostedAmountInYear,
	validateRecurringDraft,
} from "@src/features/finance/lib/recurring";
import { addRecurringForMissedMonths } from "@src/lib/utils/finance";

const item = (overrides: Partial<RecurringItem> = {}): RecurringItem => ({
	id: "r1",
	name: "Rent",
	group: "Home",
	amount: 1000,
	everyMonths: 1,
	dayOfMonth: 5,
	startMonth: "2026-01",
	...overrides,
});

describe("due dates", () => {
	it("lists a monthly item's dates up to today", () => {
		expect(dueDates(item(), "2026-03-10")).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
		expect(dueDates(item(), "2026-03-04")).toEqual(["2026-01-05", "2026-02-05"]);
	});

	it("repeats every 3 months", () => {
		expect(dueDates(item({ everyMonths: 3 }), "2026-12-31")).toEqual([
			"2026-01-05",
			"2026-04-05",
			"2026-07-05",
			"2026-10-05",
		]);
	});

	it("stops at the end month", () => {
		expect(dueDates(item({ endMonth: "2026-02" }), "2026-12-31")).toEqual([
			"2026-01-05",
			"2026-02-05",
		]);
	});

	it("clamps day 31 to the end of shorter months", () => {
		expect(dueDates(item({ dayOfMonth: 31, startMonth: "2026-01" }), "2026-03-31")).toEqual([
			"2026-01-31",
			"2026-02-28",
			"2026-03-31",
		]);
	});

	it("gives nothing for a bad item", () => {
		expect(dueDates(item({ startMonth: "nope" }), "2026-12-31")).toEqual([]);
		expect(dueDates(item({ everyMonths: 0 }), "2026-12-31")).toEqual([]);
	});
});

describe("planning what to post", () => {
	it("posts only dates after lastPosted", () => {
		const plan = planRecurringPostings([item({ lastPosted: "2026-02-05" })], "2026-04-10");
		expect(plan.map((p) => p.date)).toEqual(["2026-03-05", "2026-04-05"]);
	});

	it("skips paused items", () => {
		expect(planRecurringPostings([item({ paused: true })], "2026-04-10")).toEqual([]);
	});

	it("caps a huge backlog to the most recent entries", () => {
		const plan = planRecurringPostings([item({ startMonth: "2000-01" })], "2026-04-10");
		expect(plan).toHaveLength(120);
		expect(plan[plan.length - 1].date).toBe("2026-04-05");
	});
});

describe("addRecurringForMissedMonths", () => {
	it("adds entries once, tags them, and moves lastPosted forward", () => {
		const dispatch = vi.fn();
		const added = addRecurringForMissedMonths([item()], [], dispatch, "2026-02-20");

		expect(added).toBe(2);
		const adds = dispatch.mock.calls
			.map(([action]) => action)
			.filter((a) => a.type === "expenses/addExpense");
		expect(adds.map((a) => a.payload.date)).toEqual(["2026-01-05", "2026-02-05"]);
		expect(adds[0].payload).toMatchObject({
			name: "Rent",
			amount: 1000,
			type: "Dr",
			recurringId: "r1",
		});
		const marked = dispatch.mock.calls
			.map(([action]) => action)
			.find((a) => a.type === "finance/markRecurringPosted");
		expect(marked.payload).toEqual({ id: "r1", date: "2026-02-05" });
	});

	it("does not duplicate an entry that is already there", () => {
		const dispatch = vi.fn();
		const existing = [
			{
				id: "e1",
				date: "2026-01-05",
				group: "Home",
				name: "Rent",
				amount: 1000,
				recurringId: "r1",
			},
		];
		expect(addRecurringForMissedMonths([item()], existing, dispatch, "2026-01-20")).toBe(0);
	});
});

describe("display helpers", () => {
	it("finds the next due date, and null after the end", () => {
		expect(nextDueDate(item(), "2026-03-10")).toBe("2026-04-05");
		expect(nextDueDate(item({ endMonth: "2026-03" }), "2026-03-10")).toBeNull();
	});

	it("averages a yearly payment to a monthly cost, and a paused one to zero", () => {
		expect(monthlyEquivalent(item({ amount: 12000, everyMonths: 12 }))).toBe(1000);
		expect(monthlyEquivalent(item({ paused: true }))).toBe(0);
	});

	it("describes the schedule", () => {
		expect(describeSchedule(item({ everyMonths: 3, endMonth: "2026-12" }))).toBe(
			"Every 3 months on day 5 · 2026-01 → 2026-12",
		);
	});

	it("counts only dates still ahead in a year", () => {
		expect(unpostedAmountInYear(item(), 2026, "2026-10-10")).toBe(2000); // Nov, Dec
		expect(unpostedAmountInYear(item(), 2025, "2026-10-10")).toBe(0);
	});
});

describe("form validation", () => {
	const draft = {
		name: " Insurance ",
		group: "Home",
		amount: "1200",
		everyMonths: "12",
		dayOfMonth: "15",
		startMonth: "2026-03",
		endMonth: "",
	};

	it("accepts a good form and trims the name", () => {
		const result = validateRecurringDraft(draft);
		expect(result).toMatchObject({ ok: true, value: { name: "Insurance", everyMonths: 12 } });
	});

	it.each([
		[{ name: "  " }, "name"],
		[{ amount: "0" }, "Amount"],
		[{ everyMonths: "2.5" }, "Repeat"],
		[{ dayOfMonth: "32" }, "Day"],
		[{ startMonth: "" }, "start"],
		[{ endMonth: "2026-01" }, "before"],
	])("rejects %j", (patch, text) => {
		const result = validateRecurringDraft({ ...draft, ...patch });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain(text);
	});
});

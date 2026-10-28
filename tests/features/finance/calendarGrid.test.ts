import { describe, it, expect } from "vitest";
import {
	buildMonthGrid,
	formatCompactAmount,
} from "@src/features/finance/lib/calendarGrid";

describe("buildMonthGrid", () => {
	it("builds Monday-first weeks padded with neighbouring days", () => {
		// 1 Oct 2026 is a Thursday, 31 Oct a Saturday
		const weeks = buildMonthGrid(new Date(2026, 9, 15));
		expect(weeks).toHaveLength(5);
		expect(weeks.every((week) => week.length === 7)).toBe(true);

		expect(weeks[0][0]).toEqual({ iso: "2026-09-28", day: 28, inMonth: false });
		expect(weeks[0][3]).toEqual({ iso: "2026-10-01", day: 1, inMonth: true });
		expect(weeks[4][6]).toEqual({ iso: "2026-11-01", day: 1, inMonth: false });
	});

	it("covers every day of the month exactly once", () => {
		const inMonth = buildMonthGrid(new Date(2026, 9, 1))
			.flat()
			.filter((cell) => cell.inMonth);
		expect(inMonth).toHaveLength(31);
		expect(new Set(inMonth.map((cell) => cell.iso)).size).toBe(31);
	});

	it("needs no padding when the month fits whole weeks (Feb 2027)", () => {
		const weeks = buildMonthGrid(new Date(2027, 1, 1));
		expect(weeks).toHaveLength(4);
		expect(weeks.flat().every((cell) => cell.inMonth)).toBe(true);
	});

	it("handles leap-year February", () => {
		const days = buildMonthGrid(new Date(2028, 1, 1))
			.flat()
			.filter((cell) => cell.inMonth);
		expect(days).toHaveLength(29);
	});
});

describe("formatCompactAmount", () => {
	it("keeps small amounts whole and abbreviates thousands", () => {
		expect(formatCompactAmount(0)).toBe("0");
		expect(formatCompactAmount(950)).toBe("950");
		expect(formatCompactAmount(1234)).toBe("1.2k");
		expect(formatCompactAmount(10000)).toBe("10k");
		expect(formatCompactAmount(15400)).toBe("15k");
	});
});

import { describe, expect, it } from "vitest";
import { toLocalDay } from "@src/lib/utils/isoDate";

// Local-time constructors keep these independent of the machine's timezone.
describe("toLocalDay", () => {
	it("uses the local calendar day just before midnight", () => {
		expect(toLocalDay(new Date(2026, 9, 27, 23, 30).getTime())).toBe(
			"2026-10-27",
		);
	});

	it("rolls to the next day just after midnight", () => {
		expect(toLocalDay(new Date(2026, 9, 28, 0, 15).getTime())).toBe(
			"2026-10-28",
		);
	});

	it("zero-pads month and day", () => {
		expect(toLocalDay(new Date(2026, 0, 5, 12).getTime())).toBe("2026-01-05");
	});
});

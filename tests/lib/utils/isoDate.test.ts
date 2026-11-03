import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

// The app is used in IST (UTC+5:30), where the UTC date and the local date
// differ for most of the early morning. toISOString() would file these wrongly.
describe("toLocalDay in IST", () => {
	const originalTz = process.env.TZ;
	beforeAll(() => {
		process.env.TZ = "Asia/Kolkata";
	});
	afterAll(() => {
		if (originalTz === undefined) delete process.env.TZ;
		else process.env.TZ = originalTz;
	});

	it("files 23:30 IST under the same day", () => {
		const ts = Date.parse("2026-10-27T23:30:00+05:30");
		expect(toLocalDay(ts)).toBe("2026-10-27");
	});

	it("files 00:15 IST under the new day, although UTC is still the previous day", () => {
		const ts = Date.parse("2026-10-28T00:15:00+05:30");
		expect(new Date(ts).toISOString().slice(0, 10)).toBe("2026-10-27");
		expect(toLocalDay(ts)).toBe("2026-10-28");
	});
});

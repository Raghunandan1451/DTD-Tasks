import { afterEach, describe, expect, it, vi } from "vitest";
import { EVENT_VALIDATION_RULES } from "@src/features/event/constants";
import { handleUpdateEvent } from "@src/features/event/lib/eventHandlers";
import { getMinimumEventDate } from "@src/features/event/lib/dateUtils";
import { validateForm } from "@src/features/event/lib/utils";
import { Event } from "@src/features/event/type";

describe("event form rules", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("allows empty content and accepts a start date one month ago", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 20, 12));
		const data = {
			title: "Doctor appointment",
			content: "",
			tag: "Personal",
			startDate: getMinimumEventDate(),
			endDate: getMinimumEventDate(),
			color: "#10b981",
			repeatType: "none",
			repeatLimit: 0,
		};

		expect(getMinimumEventDate()).toBe("2026-09-20");
		expect(validateForm(data, EVENT_VALIDATION_RULES)).toEqual({});
	});

	it("rejects event start dates older than one month", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 20, 12));
		const data = {
			title: "Doctor appointment",
			content: "",
			tag: "Personal",
			startDate: "2026-09-19",
			endDate: "2026-09-19",
			color: "#10b981",
			repeatType: "none",
			repeatLimit: 0,
		};

		expect(validateForm(data, EVENT_VALIDATION_RULES)).toMatchObject({
			startDate: "Events can only be added up to one month in the past",
		});
	});
});

describe("updating all occurrences", () => {
	it("applies edited repeat settings to the base event", () => {
		const baseEvent: Event = {
			id: 12,
			title: "Weekly review",
			content: "",
			tag: "Work",
			startDate: "2026-10-06",
			endDate: "2026-10-06",
			color: "#3b82f6",
			repeatType: "weekly",
			repeatLimit: 13,
		};
		const editedOccurrence: Event = {
			...baseEvent,
			id: "12-2026-10-20",
			repeatType: "daily",
			repeatLimit: 5,
		};
		const dispatch = vi.fn();

		handleUpdateEvent(
			dispatch,
			[baseEvent],
			editedOccurrence,
			"all",
		);

		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "calendar/updateEvent",
				payload: expect.objectContaining({
					id: 12,
					repeatType: "daily",
					repeatLimit: 5,
				}),
			}),
		);
	});
});

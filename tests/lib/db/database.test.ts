import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import {
	DB_NAME,
	LEGACY_CALENDAR_KEY,
	LEGACY_EVENTS_PENDING_KEY,
	deleteValue,
	getDbStatus,
	getValue,
	resetDBForTests,
	setValue,
} from "@src/lib/db/database";

const seedV1 = async (entries: Record<string, unknown>) => {
	const db = await openDB(DB_NAME, 1, {
		upgrade(upgradeDb) {
			upgradeDb.createObjectStore("data");
		},
	});
	for (const [key, value] of Object.entries(entries)) {
		await db.put("data", value, key);
	}
	db.close();
};

describe("database v2 upgrade", () => {
	beforeEach(async () => {
		await resetDBForTests();
		globalThis.indexedDB = new IDBFactory();
	});

	it("stashes existing events and removes the calendar key", async () => {
		const calendar = { events: [{ id: 1, title: "Dentist" }] };
		await seedV1({
			[LEGACY_CALENDAR_KEY]: calendar,
			redux_expenses_data: { expenses: [] },
		});

		expect(await getValue(LEGACY_CALENDAR_KEY)).toBeNull();
		expect(await getValue(LEGACY_EVENTS_PENDING_KEY)).toEqual(calendar);
		expect(await getValue("redux_expenses_data")).toEqual({ expenses: [] });
	});

	it("drops an empty calendar without offering a download", async () => {
		await seedV1({ [LEGACY_CALENDAR_KEY]: { events: [] } });

		expect(await getValue(LEGACY_CALENDAR_KEY)).toBeNull();
		expect(await getValue(LEGACY_EVENTS_PENDING_KEY)).toBeNull();
	});

	it("leaves a fresh install without a pending key", async () => {
		expect(await getValue(LEGACY_EVENTS_PENDING_KEY)).toBeNull();
		expect(getDbStatus()).toBe("idle");
	});

	it("round-trips values and deletes them", async () => {
		await setValue("k", { a: 1 });
		expect(await getValue("k")).toEqual({ a: 1 });
		await deleteValue("k");
		expect(await getValue("k")).toBeNull();
	});
});

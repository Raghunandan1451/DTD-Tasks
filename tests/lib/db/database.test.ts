import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import {
	DB_NAME,
	LEGACY_CALENDAR_KEY,
	LEGACY_EVENTS_PENDING_KEY,
	deleteValue,
	getDB,
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

describe("database timeline stores", () => {
	beforeEach(async () => {
		await resetDBForTests();
		globalThis.indexedDB = new IDBFactory();
	});

	const timelineStores = [
		"boards",
		"data",
		"journal",
		"journalImages",
		"markdownLog",
	];

	it("repairs a v3 database that was opened before the timeline stores existed", async () => {
		const stale = await openDB(DB_NAME, 3, {
			upgrade(upgradeDb) {
				upgradeDb.createObjectStore("data");
			},
		});
		await stale.put("data", { keep: true }, "redux_expenses_data");
		stale.close();

		const db = await getDB();

		expect([...db.objectStoreNames].sort()).toEqual(timelineStores);
		expect(await getValue("redux_expenses_data")).toEqual({ keep: true });
		await expect(db.getAllFromIndex("journal", "createdAt")).resolves.toEqual([]);
		await expect(db.getAllFromIndex("markdownLog", "day")).resolves.toEqual([]);
	});

	it("adds the stores when upgrading from v2 and keeps existing data", async () => {
		const old = await openDB(DB_NAME, 2, {
			upgrade(upgradeDb) {
				upgradeDb.createObjectStore("data");
			},
		});
		await old.put("data", [1, 2], "redux_markdown_data");
		old.close();

		const db = await getDB();

		expect([...db.objectStoreNames].sort()).toEqual(timelineStores);
		expect(await getValue("redux_markdown_data")).toEqual([1, 2]);
	});

	it("adds missing indexes to a partially created store", async () => {
		const partial = await openDB(DB_NAME, 3, {
			upgrade(upgradeDb) {
				upgradeDb.createObjectStore("data");
				upgradeDb.createObjectStore("markdownLog", { keyPath: "id" });
			},
		});
		partial.close();

		const db = await getDB();
		const tx = db.transaction("markdownLog");

		expect([...tx.store.indexNames].sort()).toEqual(["day", "fileId_day_action"]);
	});
});

describe("database v5 boards store", () => {
	beforeEach(async () => {
		await resetDBForTests();
		globalThis.indexedDB = new IDBFactory();
	});

	it("adds the boards store and its updatedAt index when upgrading from v4, keeping existing data", async () => {
		const v4 = await openDB(DB_NAME, 4, {
			upgrade(upgradeDb) {
				upgradeDb.createObjectStore("data");
				upgradeDb.createObjectStore("journal", { keyPath: "id" });
			},
		});
		await v4.put("data", { keep: true }, "redux_expenses_data");
		await v4.put("journal", { id: "j1", text: "hi", createdAt: 1 });
		v4.close();

		const db = await getDB();

		expect(db.objectStoreNames.contains("boards")).toBe(true);
		const tx = db.transaction("boards");
		expect(tx.store.keyPath).toBe("id");
		expect([...tx.store.indexNames]).toEqual(["updatedAt"]);
		expect(await getValue("redux_expenses_data")).toEqual({ keep: true });
		expect((await db.get("journal", "j1"))?.text).toBe("hi");
	});

	it("is a no-op for the boards store on a database that already has it", async () => {
		const first = await getDB();
		await first.put("boards", {
			id: "b1",
			name: "Keep me",
			nodes: [],
			edges: [],
			viewport: { x: 0, y: 0, zoom: 1 },
			createdAt: 1,
			updatedAt: 1,
		});
		await resetDBForTests();

		const again = await getDB();
		expect((await again.get("boards", "b1"))?.name).toBe("Keep me");
	});
});

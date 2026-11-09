import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
	BOARDS_BACKUP_FILE,
	buildBoardsBackup,
	describeBoardsImport,
	importBoardsFile,
	parseBoardsBackup,
} from "@src/features/nodes/lib/boardBackup";
import JSZip from "jszip";
import { getDB, resetDBForTests } from "@src/lib/db/database";
import { createBoard, listBoards, saveBoardContent } from "@src/lib/db/boardsRepo";
import type { Board } from "@src/lib/db/types";
import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";
import { UploadError } from "@src/lib/utils/uploadError";

const board = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
	id: "b1",
	name: "Ideas",
	nodes: [
		{
			id: "n1",
			type: "note",
			position: { x: 0, y: 0 },
			width: 200,
			height: 100,
			data: { title: "A", text: "first", color: "cyan" },
		},
		{
			id: "n2",
			type: "shape",
			position: { x: 300, y: 0 },
			data: { text: "B", color: "rose", shape: "diamond" },
		},
		{
			id: "n3",
			type: "text",
			position: { x: 0, y: 200 },
			data: { text: "C", color: "slate" },
		},
	],
	edges: [{ id: "e1", source: "n1", target: "n2", label: "to", arrow: true }],
	viewport: { x: 10, y: 20, zoom: 1.5 },
	createdAt: 1_760_000_000_000,
	updatedAt: 1_760_000_100_000,
	...overrides,
});

const backup = (boards: unknown[] = [board()], extra: Record<string, unknown> = {}) => ({
	schemaVersion: SCHEMA_VERSION,
	boards,
	...extra,
});

// jsdom's File has no text(); browsers do. Only text() is used by the importer.
const fileOf = (content: unknown): File =>
	({
		text: async () => (typeof content === "string" ? content : JSON.stringify(content)),
	}) as unknown as File;

const errorOf = async (run: () => unknown): Promise<string> => {
	try {
		await run();
	} catch (error) {
		expect(error).toBeInstanceOf(UploadError);
		return (error as Error).message;
	}
	throw new Error("Expected an UploadError");
};

beforeEach(async () => {
	await resetDBForTests();
	globalThis.indexedDB = new IDBFactory();
});

describe("schema validation", () => {
	it("accepts a valid backup", () => {
		const boards = parseBoardsBackup(backup());
		expect(boards).toHaveLength(1);
		expect(boards[0].nodes).toHaveLength(3);
		expect(boards[0].edges).toEqual([
			{ id: "e1", source: "n1", target: "n2", label: "to", arrow: true },
		]);
	});

	it("accepts a file made before schemaVersion existed, and an empty list", () => {
		expect(() => parseBoardsBackup({ boards: [board()] })).not.toThrow();
		expect(parseBoardsBackup(backup([]))).toEqual([]);
	});

	it("rejects JSON that is not a Boards backup", async () => {
		const expected = "This doesn't look like a Boards backup file";
		expect(await errorOf(() => parseBoardsBackup([]))).toBe(expected);
		expect(await errorOf(() => parseBoardsBackup({ journal: [] }))).toBe(expected);
		expect(await errorOf(() => parseBoardsBackup(null))).toBe(expected);
	});

	it("rejects a backup from a newer app version", async () => {
		expect(
			await errorOf(() => parseBoardsBackup(backup([], { schemaVersion: SCHEMA_VERSION + 1 }))),
		).toMatch(/newer version/);
		expect(await errorOf(() => parseBoardsBackup(backup([], { schemaVersion: "two" })))).toMatch(
			/invalid schemaVersion/,
		);
	});

	it("rejects boards that are not a list", async () => {
		expect(await errorOf(() => parseBoardsBackup({ boards: {} }))).toMatch(/must be a list/);
	});

	it.each([
		[
			"a node with an unknown type",
			{
				nodes: [
					{
						id: "n",
						type: "star",
						position: { x: 0, y: 0 },
						data: { color: "slate" },
					},
				],
			},
			/unknown "type"/,
		],
		[
			"a raw hex colour",
			{
				nodes: [
					{
						id: "n",
						type: "note",
						position: { x: 0, y: 0 },
						data: { color: "#ff0000" },
					},
				],
			},
			/unknown "color"/,
		],
		[
			"an unknown shape",
			{
				nodes: [
					{
						id: "n",
						type: "shape",
						position: { x: 0, y: 0 },
						data: { color: "slate", shape: "star" },
					},
				],
			},
			/unknown "shape"/,
		],
		[
			"a position that is not a number",
			{
				nodes: [
					{
						id: "n",
						type: "note",
						position: { x: "0", y: 0 },
						data: { color: "slate" },
					},
				],
			},
			/invalid "position"/,
		],
		[
			"a non-positive width",
			{
				nodes: [
					{
						id: "n",
						type: "note",
						position: { x: 0, y: 0 },
						width: -5,
						data: { color: "slate" },
					},
				],
			},
			/invalid "width"/,
		],
		[
			"text over 2000 characters",
			{
				nodes: [
					{
						id: "n",
						type: "note",
						position: { x: 0, y: 0 },
						data: { color: "slate", text: "x".repeat(2001) },
					},
				],
			},
			/2000 characters/,
		],
		[
			"an edge to a missing node",
			{ edges: [{ id: "e", source: "n1", target: "ghost" }] },
			/does not exist/,
		],
		[
			"an edge with a non-string label",
			{ edges: [{ id: "e", source: "n1", target: "n2", label: 5 }] },
			/invalid "label"/,
		],
		[
			"an edge with a non-boolean arrow",
			{ edges: [{ id: "e", source: "n1", target: "n2", arrow: "yes" }] },
			/invalid "arrow"/,
		],
		["a missing viewport", { viewport: undefined }, /invalid "viewport"/],
		["a zero zoom", { viewport: { x: 0, y: 0, zoom: 0 } }, /invalid "viewport"/],
		["a missing name", { name: "  " }, /missing its "name"/],
		["an invalid timestamp", { updatedAt: "yesterday" }, /invalid timestamp/],
		["nodes that are not a list", { nodes: "none" }, /must be a list/],
	])("rejects %s", async (_label, overrides, message) => {
		const text = await errorOf(() => parseBoardsBackup(backup([board(overrides)])));
		expect(text).toMatch(message);
		expect(text).toMatch(/^Backup has invalid data: /);
	});

	it("rejects repeated node ids and repeated board ids", async () => {
		const node = {
			id: "n",
			type: "text",
			position: { x: 0, y: 0 },
			data: { color: "slate" },
		};
		expect(
			await errorOf(() => parseBoardsBackup(backup([board({ nodes: [node, node], edges: [] })]))),
		).toMatch(/repeats an id/);
		expect(await errorOf(() => parseBoardsBackup(backup([board(), board()])))).toMatch(
			/repeats a board id/,
		);
	});

	it("names the board and item at fault, and caps the list of problems", async () => {
		const text = await errorOf(() =>
			parseBoardsBackup(
				backup([
					board({
						name: "Broken",
						nodes: [{ id: "n", type: "x", position: { x: 0, y: 0 }, data: {} }],
					}),
					null,
					"nope",
					7,
				]),
			),
		);
		expect(text).toContain('Board "Broken": node 1');
		expect(text).toMatch(/\(and \d+ more\)$/);
	});

	it("rejects the whole file when any board is bad, importing nothing", async () => {
		const file = fileOf(backup([board(), board({ id: "b2", name: "Bad", viewport: null })]));
		await errorOf(() => importBoardsFile(file));
		expect(await listBoards()).toEqual([]);
	});

	it("drops unknown fields so they are never stored", () => {
		const dirty = board();
		(dirty.nodes as Record<string, unknown>[])[0].selected = true;
		(dirty.nodes as Record<string, unknown>[])[0].measured = { width: 1 };
		(dirty as Record<string, unknown>).secret = "x";

		const [clean] = parseBoardsBackup(backup([dirty]));
		expect(Object.keys(clean).sort()).toEqual([
			"createdAt",
			"edges",
			"id",
			"name",
			"nodes",
			"updatedAt",
			"viewport",
		]);
		expect("selected" in clean.nodes[0]).toBe(false);
		expect("measured" in clean.nodes[0]).toBe(false);
	});

	it("reports malformed JSON readably", async () => {
		expect(await errorOf(() => importBoardsFile(fileOf("{oops")))).toBe(
			"That file is not valid JSON",
		);
	});

	describe("ZIP files", () => {
		const zipOf = async (entries: Record<string, string>): Promise<File> => {
			const zip = new JSZip();
			Object.entries(entries).forEach(([name, text]) => zip.file(name, text));
			const bytes = await zip.generateAsync({ type: "uint8array" });
			return new File([bytes], "boards-export.zip", { type: "application/zip" });
		};

		it("imports the backup inside a boards ZIP", async () => {
			const file = await zipOf({
				[BOARDS_BACKUP_FILE]: JSON.stringify(backup([board()])),
				"Images/Ideas.png": "not read",
			});
			expect(await importBoardsFile(file)).toBe("Imported 1 board");
			expect((await listBoards()).map((b) => b.id)).toEqual(["b1"]);
		});

		it("finds the backup inside a folder, as in the full Home download", async () => {
			const file = await zipOf({
				[`Boards/${BOARDS_BACKUP_FILE}`]: JSON.stringify(backup([board()])),
			});
			expect(await importBoardsFile(file)).toBe("Imported 1 board");
		});

		it("says so when the ZIP has no boards backup", async () => {
			const file = await zipOf({ "Images/Ideas.png": "x" });
			expect(await errorOf(() => importBoardsFile(file))).toBe(
				`This ZIP has no ${BOARDS_BACKUP_FILE}`,
			);
		});
	});
});

describe("import merge and dedupe", () => {
	it("adds new boards and says how many", async () => {
		const message = await importBoardsFile(
			fileOf(backup([board(), board({ id: "b2", name: "Two" })])),
		);

		expect(message).toBe("Imported 2 boards");
		expect((await listBoards()).map((b) => b.id).sort()).toEqual(["b1", "b2"]);
	});

	it("skips boards that already exist and never overwrites them", async () => {
		await importBoardsFile(fileOf(backup([board({ name: "Mine" })])));

		const message = await importBoardsFile(
			fileOf(backup([board({ name: "Theirs" }), board({ id: "b2", name: "New" })])),
		);

		expect(message).toBe("Imported 1 board (1 duplicates skipped)");
		const names = Object.fromEntries((await listBoards()).map((b) => [b.id, b.name]));
		expect(names).toEqual({ b1: "Mine", b2: "New" });
	});

	it("is idempotent: importing the same file twice adds nothing the second time", async () => {
		const file = backup([board()]);
		await importBoardsFile(fileOf(file));
		const again = await importBoardsFile(fileOf(file));

		expect(again).toBe("Nothing new to import (1 already existed)");
		expect(await listBoards()).toHaveLength(1);
	});

	it("describes an empty backup", () => {
		expect(describeBoardsImport({ added: 0, skipped: 0 })).toBe("The backup was empty");
	});
});

describe("export then import", () => {
	it("reproduces a board in a fresh database", async () => {
		const created = await createBoard("Round trip");
		await saveBoardContent(created.id, {
			nodes: parseBoardsBackup(backup())[0].nodes,
			edges: parseBoardsBackup(backup())[0].edges,
			viewport: { x: 5, y: 6, zoom: 0.75 },
		});

		const exported = await buildBoardsBackup();
		expect(exported.schemaVersion).toBe(SCHEMA_VERSION);
		const original = (await listBoards())[0];

		// A fresh browser profile.
		await resetDBForTests();
		globalThis.indexedDB = new IDBFactory();
		expect(await listBoards()).toEqual([]);

		await importBoardsFile(fileOf(JSON.stringify(exported)));
		const restored = (await listBoards())[0] as Board;

		expect(restored).toEqual(original);
		expect(restored.viewport).toEqual({ x: 5, y: 6, zoom: 0.75 });
		expect(restored.nodes).toHaveLength(3);
		expect(restored.edges).toHaveLength(1);
	});

	it("names the backup file", () => {
		expect(BOARDS_BACKUP_FILE).toBe("boards-backup.json");
	});

	it("opens a database that has the boards store", async () => {
		expect((await getDB()).objectStoreNames.contains("boards")).toBe(true);
	});
});

describe("v2 layout fields", () => {
	it("keeps layoutMode, outline and treeRootId", () => {
		const [parsed] = parseBoardsBackup(
			backup([board({ layoutMode: "tree", outline: "A -> B", treeRootId: "n1" })]),
		);
		expect(parsed.layoutMode).toBe("tree");
		expect(parsed.outline).toBe("A -> B");
		expect(parsed.treeRootId).toBe("n1");
	});

	it("opens older backups without them as free boards", () => {
		const [parsed] = parseBoardsBackup(backup());
		expect(parsed.layoutMode).toBeUndefined();
	});

	it("rejects an unknown layoutMode", () => {
		expect(() => parseBoardsBackup(backup([board({ layoutMode: "spiral" })]))).toThrow(UploadError);
	});
});

describe("grid names", () => {
	it("keeps row and column names, clamped and without trailing blanks", () => {
		const [parsed] = parseBoardsBackup(
			backup([
				board({
					layoutMode: "grid",
					gridRowLabels: [" Mon ", "Tue", ""],
					gridColumnLabels: ["Task", "x".repeat(300)],
				}),
			]),
		);
		expect(parsed.gridRowLabels).toEqual(["Mon", "Tue"]);
		expect(parsed.gridColumnLabels?.[0]).toBe("Task");
		expect(parsed.gridColumnLabels?.[1]).toHaveLength(80);
	});

	it("opens boards without names", () => {
		const [parsed] = parseBoardsBackup(backup());
		expect(parsed.gridRowLabels).toBeUndefined();
		expect(parsed.gridColumnLabels).toBeUndefined();
	});

	it("rejects names that are not a list of strings", () => {
		expect(() => parseBoardsBackup(backup([board({ gridRowLabels: "Mon" })]))).toThrow(UploadError);
		expect(() => parseBoardsBackup(backup([board({ gridColumnLabels: [1, 2] })]))).toThrow(
			UploadError,
		);
	});
});

describe("grid corner title", () => {
	it("keeps it trimmed and clamped, and rejects a non-string", () => {
		const [parsed] = parseBoardsBackup(
			backup([board({ layoutMode: "grid", gridCornerLabel: "  Days x Exercise  " })]),
		);
		expect(parsed.gridCornerLabel).toBe("Days x Exercise");
		const [long] = parseBoardsBackup(backup([board({ gridCornerLabel: "x".repeat(300) })]));
		expect(long.gridCornerLabel).toHaveLength(80);
		expect(() => parseBoardsBackup(backup([board({ gridCornerLabel: 5 })]))).toThrow(UploadError);
	});
});

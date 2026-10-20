import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { indexedDBValues, mockDatabase, saveAsMock } = vi.hoisted(() => {
	const values = new Map<string, unknown>();
	const database = {
		put: vi.fn(async (_store: string, value: unknown, key: string) => {
			values.set(key, value);
		}),
		get: vi.fn(async (_store: string, key: string) => values.get(key)),
	};
	return {
		indexedDBValues: values,
		mockDatabase: database,
		saveAsMock: vi.fn(),
	};
});

vi.mock("idb", () => ({
	openDB: vi.fn(async () => mockDatabase),
}));
vi.mock("file-saver", () => ({ saveAs: saveAsMock }));

import {
	chooseOutputDirectory,
} from "@src/lib/utils/fileStorage/outputDirectory";
import { getAppData, saveAppData } from "@src/lib/utils/fileStorage/appData";
import {
	readMarkdownTree,
	readOutputFile,
	readOutputFiles,
	writeOutputFile,
} from "@src/lib/utils/fileStorage/outputFiles";

class MemoryFileHandle {
	readonly kind = "file";
	content = "";

	constructor(readonly name: string) {}

	async getFile(): Promise<File> {
		const file = new File([this.content], this.name);
		Object.defineProperty(file, "text", {
			value: async () => this.content,
		});
		return file;
	}

	async createWritable() {
		return {
			write: async (value: Blob | string) => {
				this.content =
					typeof value === "string"
						? value
						: await new Promise<string>((resolve, reject) => {
								const reader = new FileReader();
								reader.onload = () =>
									resolve(String(reader.result));
								reader.onerror = () => reject(reader.error);
								reader.readAsText(value);
							});
			},
			close: async () => undefined,
			abort: async () => undefined,
		};
	}
}

class MemoryDirectoryHandle {
	readonly kind = "directory";
	private readonly children = new Map<
		string,
		MemoryDirectoryHandle | MemoryFileHandle
	>();

	constructor(readonly name: string) {}

	async getDirectoryHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<MemoryDirectoryHandle> {
		const existing = this.children.get(name);
		if (existing instanceof MemoryDirectoryHandle) return existing;
		if (existing || !options?.create) {
			throw new DOMException("Directory not found", "NotFoundError");
		}
		const directory = new MemoryDirectoryHandle(name);
		this.children.set(name, directory);
		return directory;
	}

	async getFileHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<MemoryFileHandle> {
		const existing = this.children.get(name);
		if (existing instanceof MemoryFileHandle) return existing;
		if (existing || !options?.create) {
			throw new DOMException("File not found", "NotFoundError");
		}
		const file = new MemoryFileHandle(name);
		this.children.set(name, file);
		return file;
	}

	async removeEntry(name: string): Promise<void> {
		if (!this.children.delete(name)) {
			throw new DOMException("Entry not found", "NotFoundError");
		}
	}

	async queryPermission(): Promise<PermissionState> {
		return "granted";
	}

	async requestPermission(): Promise<PermissionState> {
		return "granted";
	}

	async *entries(): AsyncGenerator<
		[string, MemoryDirectoryHandle | MemoryFileHandle]
	> {
		yield* this.children.entries();
	}
}

describe("file storage", () => {
	let selectedDirectory: MemoryDirectoryHandle;
	const originalUserAgent = navigator.userAgent;

	afterEach(() => {
		Object.defineProperty(navigator, "userAgent", {
			configurable: true,
			value: originalUserAgent,
		});
		Object.defineProperty(navigator, "storage", {
			configurable: true,
			value: undefined,
		});
	});

	beforeEach(() => {
		indexedDBValues.clear();
		vi.clearAllMocks();
		selectedDirectory = new MemoryDirectoryHandle("Documents");
		Object.defineProperty(window, "showDirectoryPicker", {
			configurable: true,
			value: vi.fn(async () => selectedDirectory),
		});
	});

	it("writes and reads files under the selected app folder", async () => {
		await expect(chooseOutputDirectory()).resolves.toBe("Documents");

		await writeOutputFile(
			"Events/2026/10/events-2026-10.json",
			JSON.stringify({ month: "2026-10", events: [] }),
		);
		await writeOutputFile(
			"Events/2026/10/events-2026-10.json",
			JSON.stringify({ month: "2026-10", events: [{ id: "new" }] }),
		);

		await expect(
			readOutputFile("Events/2026/10/events-2026-10.json"),
		).resolves.toContain('"id":"new"');
		await expect(
			readOutputFiles("Events", (name) => name.endsWith(".json")),
		).resolves.toEqual([
			{
				path: "Events/2026/10/events-2026-10.json",
				content: '{"month":"2026-10","events":[{"id":"new"}]}',
			},
		]);

		await writeOutputFile("Markdown/notes/readme.md", "# Local file");
		await writeOutputFile("Markdown/notes/readme.pdf", "generated pdf");
		await expect(readMarkdownTree()).resolves.toEqual([
			{
				path: "notes",
				type: "folder",
				children: [
					{
						path: "readme.md",
						type: "file",
						content: "# Local file",
					},
				],
			},
		]);
	});

	it("rejects paths that try to leave the selected app folder", async () => {
		await chooseOutputDirectory();
		await expect(
			writeOutputFile("../outside.json", "invalid"),
		).rejects.toThrow("Invalid output file path.");
	});

	it("migrates existing mobile data to OPFS and uses it as primary storage", async () => {
		const legacyData = { events: [{ id: "legacy" }] };
		const updatedData = { events: [{ id: "updated" }] };
		const opfsRoot = new MemoryDirectoryHandle("OPFS");
		indexedDBValues.set("redux_calendar_data", legacyData);
		Object.defineProperty(navigator, "userAgent", {
			configurable: true,
			value: "Mozilla/5.0 (Android 14; Mobile)",
		});
		Object.defineProperty(navigator, "storage", {
			configurable: true,
			value: { getDirectory: async () => opfsRoot },
		});

		await expect(
			getAppData<typeof legacyData>("redux_calendar_data"),
		).resolves.toEqual(legacyData);
		expect(indexedDBValues.get("opfs_data_migration_v1")).toBe(true);

		await saveAppData("redux_calendar_data", updatedData);
		await expect(
			getAppData<typeof updatedData>("redux_calendar_data"),
		).resolves.toEqual(updatedData);
		expect(indexedDBValues.get("redux_calendar_data")).toEqual(legacyData);
	});

	it("stores mobile output in IndexedDB and downloads it when OPFS is unavailable", async () => {
		Object.defineProperty(navigator, "userAgent", {
			configurable: true,
			value: "Mozilla/5.0 (Android 14; Mobile)",
		});
		Object.defineProperty(navigator, "storage", {
			configurable: true,
			value: {
				getDirectory: async () => {
					throw new Error("OPFS unavailable");
				},
			},
		});

		await writeOutputFile(
			"Expenses/2026/10/expenses-2026-10.json",
			'{"month":"2026-10"}',
		);

		await expect(
			readOutputFile("Expenses/2026/10/expenses-2026-10.json"),
		).resolves.toBe('{"month":"2026-10"}');
		await expect(
			readOutputFiles("Expenses", (name) => name.endsWith(".json")),
		).resolves.toEqual([
			{
				path: "Expenses/2026/10/expenses-2026-10.json",
				content: '{"month":"2026-10"}',
			},
		]);
		expect(saveAsMock).toHaveBeenCalledTimes(1);
	});
});

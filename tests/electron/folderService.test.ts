// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	UnsafePathError,
	inspectFolder,
	listDir,
	makeDir,
	prepareFolder,
	readText,
	renamePath,
	resolveInside,
	trashPath,
	writeText,
} from "@shell/folderService";
import { readConfig, writeConfig } from "@shell/appConfig";

let root: string;

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), "aiolists-"));
});
afterEach(async () => {
	await fs.rm(root, { recursive: true, force: true });
});

describe("inspectFolder", () => {
	it("reports an empty folder, a non-empty folder and a prepared folder", async () => {
		expect(await inspectFolder(root)).toEqual({ kind: "empty" });
		await fs.writeFile(path.join(root, "photo.png"), "x");
		expect(await inspectFolder(root)).toEqual({ kind: "not-empty" });
		await prepareFolder(root);
		expect(await inspectFolder(root)).toEqual({ kind: "ok" });
		// Existing files are left alone.
		expect(await fs.readFile(path.join(root, "photo.png"), "utf8")).toBe("x");
	});

	it("reports a missing folder and a file instead of a folder", async () => {
		expect(await inspectFolder(path.join(root, "nope"))).toEqual({
			kind: "problem",
			problem: "missing",
		});
		const file = path.join(root, "a.txt");
		await fs.writeFile(file, "x");
		expect(await inspectFolder(file)).toEqual({
			kind: "problem",
			problem: "not-a-folder",
		});
	});

	it("reports a damaged marker and a marker from a newer version", async () => {
		await fs.mkdir(path.join(root, ".aiolists"));
		await fs.writeFile(path.join(root, ".aiolists", "meta.json"), "{nope");
		expect(await inspectFolder(root)).toEqual({
			kind: "problem",
			problem: "damaged-marker",
		});
		await fs.writeFile(
			path.join(root, ".aiolists", "meta.json"),
			JSON.stringify({ app: "AIOLists", formatVersion: 99 }),
		);
		expect(await inspectFolder(root)).toEqual({
			kind: "problem",
			problem: "newer-format",
		});
	});
});

describe("resolveInside", () => {
	it.each([
		"../escape.md",
		"a/../../escape.md",
		"/etc/passwd",
		"C:\\Windows\\win.ini",
		"c:foo",
		"\\\\server\\share\\x",
		"bad\0name",
	])("rejects %j", async (rel) => {
		await expect(resolveInside(root, rel)).rejects.toBeInstanceOf(UnsafePathError);
	});

	it("accepts normal relative paths, with either slash", async () => {
		expect(await resolveInside(root, "notes/a.md")).toBe(path.join(root, "notes", "a.md"));
		expect(await resolveInside(root, "notes\\a.md")).toBe(path.join(root, "notes", "a.md"));
	});

	it("rejects a link that points outside the folder", async () => {
		const outside = await fs.mkdtemp(path.join(os.tmpdir(), "aiolists-out-"));
		try {
			await fs.symlink(outside, path.join(root, "link"), "junction");
		} catch {
			await fs.rm(outside, { recursive: true, force: true });
			return; // links not allowed on this machine
		}
		try {
			await expect(resolveInside(root, "link/x.md")).rejects.toBeInstanceOf(
				UnsafePathError,
			);
		} finally {
			await fs.rm(outside, { recursive: true, force: true });
		}
	});
});

describe("file operations", () => {
	beforeEach(() => prepareFolder(root));

	it("writes, reads, lists and renames", async () => {
		await writeText(root, "notes/a.md", "hello");
		expect(await readText(root, "notes/a.md")).toBe("hello");
		expect(await readText(root, "notes/missing.md")).toBeNull();

		await writeText(root, "notes/a.md", "changed");
		expect(await readText(root, "notes/a.md")).toBe("changed");
		const names = (await fs.readdir(path.join(root, "notes"))).sort();
		expect(names).toEqual(["a.md"]); // no leftover temp files

		await makeDir(root, "notes/sub");
		await renamePath(root, "notes/a.md", "notes/sub/b.md");
		const listed = await listDir(root, "notes");
		expect(listed.map((e) => `${e.kind}:${e.name}`).sort()).toEqual(["dir:sub"]);
		expect(await readText(root, "notes/sub/b.md")).toBe("changed");
	});

	it("hides the marker folder from listings and refuses to touch it", async () => {
		expect((await listDir(root, "")).map((e) => e.name)).not.toContain(".aiolists");
		await expect(writeText(root, ".aiolists/meta.json", "x")).rejects.toBeInstanceOf(
			UnsafePathError,
		);
		await expect(
			renamePath(root, ".aiolists/meta.json", "gone.json"),
		).rejects.toBeInstanceOf(UnsafePathError);
		await expect(trashPath(root, ".aiolists", async () => {})).rejects.toBeInstanceOf(
			UnsafePathError,
		);
		await expect(trashPath(root, ".", async () => {})).rejects.toBeInstanceOf(
			UnsafePathError,
		);
	});

	it("hands the absolute path to the trash function", async () => {
		await writeText(root, "a.md", "x");
		const trash = vi.fn(async () => {});
		await trashPath(root, "a.md", trash);
		expect(trash).toHaveBeenCalledWith(path.join(root, "a.md"));
	});
});

describe("appConfig", () => {
	it("round-trips and tolerates a missing or broken file", async () => {
		expect(await readConfig(root)).toEqual({});
		await writeConfig(root, { dataFolder: "D:\\Notes" });
		expect(await readConfig(root)).toEqual({ dataFolder: "D:\\Notes" });
		await fs.writeFile(path.join(root, "config.json"), "{broken");
		expect(await readConfig(root)).toEqual({});
	});
});

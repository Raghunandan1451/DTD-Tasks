import { promises as fs } from "node:fs";
import path from "node:path";
import {
	DirEntry,
	FORMAT_VERSION,
	FolderProblem,
	MARKER_DIR,
	MARKER_FILE,
} from "@src/lib/desktop/types";

export type Inspection =
	| { kind: "ok" }
	| { kind: "empty" }
	| { kind: "not-empty" }
	| { kind: "problem"; problem: FolderProblem };

const OLD_MARKER_DIR = ".aiolists";

const markerPath = (root: string) => path.join(root, MARKER_FILE);

async function canWrite(root: string): Promise<boolean> {
	const probe = path.join(root, `.dtdtasks-write-test-${process.pid}`);
	try {
		await fs.writeFile(probe, "");
		await fs.rm(probe, { force: true });
		return true;
	} catch {
		return false;
	}
}

/** Look at a folder without changing it. */
export async function inspectFolder(root: string): Promise<Inspection> {
	let stat;
	try {
		stat = await fs.stat(root);
	} catch {
		return { kind: "problem", problem: "missing" };
	}
	if (!stat.isDirectory())
		return { kind: "problem", problem: "not-a-folder" };

	let names: string[];
	try {
		names = await fs.readdir(root);
	} catch {
		return { kind: "problem", problem: "not-readable" };
	}

	// Folders made before the rename used ".aiolists": move our own folder over once.
	if (!names.includes(MARKER_DIR) && names.includes(OLD_MARKER_DIR)) {
		try {
			const old = JSON.parse(
				await fs.readFile(
					path.join(root, OLD_MARKER_DIR, "meta.json"),
					"utf8",
				),
			);
			if (old?.app === "AIOLists") {
				await fs.rename(
					path.join(root, OLD_MARKER_DIR),
					path.join(root, MARKER_DIR),
				);
				names = await fs.readdir(root);
			}
		} catch {
			/* not ours or not movable: treated as an ordinary folder below */
		}
	}

	if (names.includes(MARKER_DIR)) {
		try {
			const meta = JSON.parse(
				await fs.readFile(markerPath(root), "utf8"),
			);
			if (
				(meta?.app !== "DTDTasks" && meta?.app !== "AIOLists") ||
				typeof meta.formatVersion !== "number"
			) {
				return { kind: "problem", problem: "damaged-marker" };
			}
			if (meta.formatVersion > FORMAT_VERSION) {
				return { kind: "problem", problem: "newer-format" };
			}
		} catch {
			return { kind: "problem", problem: "damaged-marker" };
		}
		return (await canWrite(root))
			? { kind: "ok" }
			: { kind: "problem", problem: "not-writable" };
	}

	if (!(await canWrite(root)))
		return { kind: "problem", problem: "not-writable" };
	return names.length === 0 ? { kind: "empty" } : { kind: "not-empty" };
}

export async function atomicWrite(
	target: string,
	content: string | Buffer,
): Promise<void> {
	await fs.mkdir(path.dirname(target), { recursive: true });
	const tmp = `${target}.${process.pid}.tmp`;
	await fs.writeFile(
		tmp,
		content,
		typeof content === "string" ? "utf8" : undefined,
	);
	await fs.rename(tmp, target);
}

/** Write the marker so the folder is recognised on later starts. */
export async function prepareFolder(root: string): Promise<void> {
	await fs.mkdir(path.join(root, MARKER_DIR), { recursive: true });
	await atomicWrite(
		markerPath(root),
		JSON.stringify(
			{
				app: "DTDTasks",
				formatVersion: FORMAT_VERSION,
				createdAt: new Date().toISOString(),
			},
			null,
			2,
		),
	);
}

export class UnsafePathError extends Error {}

const isInside = (root: string, target: string) => {
	const rel = path.relative(root, target);
	return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/**
 * Turn a path the page sent into a real path inside the data folder.
 * Rejects absolute paths, `..`, drive letters, UNC paths and NUL, and anything
 * that reaches outside through a symlink.
 */
export async function resolveInside(
	root: string,
	rel: string,
): Promise<string> {
	if (typeof rel !== "string" || rel.includes("\0")) {
		throw new UnsafePathError("Bad path");
	}
	const normalized = rel.replace(/\\/g, "/");
	if (
		normalized.startsWith("/") ||
		/^[a-zA-Z]:/.test(normalized) ||
		normalized.split("/").some((part) => part === "..")
	) {
		throw new UnsafePathError("Path must stay inside the data folder");
	}
	const target = path.resolve(root, normalized);
	if (!isInside(root, target)) {
		throw new UnsafePathError("Path must stay inside the data folder");
	}

	// Follow links on the deepest part that already exists.
	const realRoot = await fs.realpath(root);
	let probe = target;
	for (;;) {
		try {
			const real = await fs.realpath(probe);
			if (!isInside(realRoot, real)) {
				throw new UnsafePathError("Path leaves the data folder");
			}
			break;
		} catch (error) {
			if (error instanceof UnsafePathError) throw error;
			const parent = path.dirname(probe);
			if (parent === probe) break;
			probe = parent;
		}
	}
	return target;
}

const isProtected = (root: string, target: string) => {
	const t = target.toLowerCase();
	return (
		t === markerPath(root).toLowerCase() ||
		t === path.join(root, MARKER_DIR).toLowerCase()
	);
};

export async function readText(
	root: string,
	rel: string,
): Promise<string | null> {
	const target = await resolveInside(root, rel);
	try {
		return await fs.readFile(target, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw error;
	}
}

export async function writeText(
	root: string,
	rel: string,
	content: string,
): Promise<void> {
	const target = await resolveInside(root, rel);
	if (isProtected(root, target)) {
		throw new UnsafePathError("That file is managed by the app");
	}
	await atomicWrite(target, content);
}

/** Writes a binary file (a PDF); `base64` is what the page sends over IPC. */
export async function writeBinary(
	root: string,
	rel: string,
	base64: string,
): Promise<void> {
	const target = await resolveInside(root, rel);
	if (isProtected(root, target)) {
		throw new UnsafePathError("That file is managed by the app");
	}
	await atomicWrite(target, Buffer.from(base64, "base64"));
}

/** Reads a binary file as base64, or null when it does not exist. */
export async function readBinary(
	root: string,
	rel: string,
): Promise<string | null> {
	const target = await resolveInside(root, rel);
	try {
		return (await fs.readFile(target)).toString("base64");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw error;
	}
}

/** The absolute path of a folder inside the data folder, created if missing, for the file explorer. */
export async function folderToOpen(root: string, rel: string): Promise<string> {
	const target = await resolveInside(root, rel || ".");
	await fs.mkdir(target, { recursive: true });
	return target;
}

export async function listDir(root: string, rel: string): Promise<DirEntry[]> {
	const target = await resolveInside(root, rel || ".");
	let entries;
	try {
		entries = await fs.readdir(target, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
	const out: DirEntry[] = [];
	for (const entry of entries) {
		if (entry.name === MARKER_DIR || entry.name.endsWith(".tmp")) continue;
		if (!entry.isFile() && !entry.isDirectory()) continue;
		const stat = await fs.stat(path.join(target, entry.name));
		out.push({
			name: entry.name,
			kind: entry.isDirectory() ? "dir" : "file",
			size: stat.size,
			modifiedMs: stat.mtimeMs,
		});
	}
	return out;
}

export async function makeDir(root: string, rel: string): Promise<void> {
	const target = await resolveInside(root, rel);
	if (isProtected(root, target)) {
		throw new UnsafePathError("That folder is managed by the app");
	}
	await fs.mkdir(target, { recursive: true });
}

export async function renamePath(
	root: string,
	from: string,
	to: string,
): Promise<void> {
	const a = await resolveInside(root, from);
	const b = await resolveInside(root, to);
	if (isProtected(root, a) || isProtected(root, b)) {
		throw new UnsafePathError("That file is managed by the app");
	}
	await fs.mkdir(path.dirname(b), { recursive: true });
	await fs.rename(a, b);
}

/** `moveToTrash` is Electron's `shell.trashItem`, passed in so this file stays plain Node. */
export async function trashPath(
	root: string,
	rel: string,
	moveToTrash: (absolute: string) => Promise<void>,
): Promise<void> {
	const target = await resolveInside(root, rel);
	if (target === root || isProtected(root, target)) {
		throw new UnsafePathError("That cannot be deleted");
	}
	await moveToTrash(target);
}

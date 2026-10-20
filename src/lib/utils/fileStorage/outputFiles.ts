import { saveAs } from "file-saver";
import type { File, Folder } from "@src/features/markdown/type";
import { deleteFromIndexedDB, getFromIndexedDB, saveToIndexedDB } from "./database";
import { getOutputRootDirectory } from "./outputDirectory";
import {
	isMobileStorage,
	readBlobAsText,
	readTextFile,
} from "./appData";

const OUTPUT_FALLBACK_PREFIX = "output_file:";
const OUTPUT_FALLBACK_MANIFEST_KEY = "output_file_manifest";
let outputWriteQueue: Promise<void> = Promise.resolve();

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
	entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
};

export const queueOutputWrite = (write: () => Promise<void>): Promise<void> => {
	outputWriteQueue = outputWriteQueue.then(write, write);
	return outputWriteQueue;
};

const validatePathSegments = (relativePath: string): string[] => {
	const segments = relativePath.split(/[\\/]/).filter(Boolean);
	if (
		segments.length === 0 ||
		segments.some((segment) => segment === "." || segment === "..")
	) {
		throw new Error("Invalid output file path.");
	}
	return segments;
};

const getFileDirectory = async (
	relativePath: string,
): Promise<{ directory: FileSystemDirectoryHandle; fileName: string }> => {
	const segments = validatePathSegments(relativePath);
	const fileName = segments.pop();
	if (!fileName) throw new Error("Output file name is missing.");

	let directory = await getOutputRootDirectory();
	for (const segment of segments) {
		directory = await directory.getDirectoryHandle(segment, {
			create: true,
		});
	}
	return { directory, fileName };
};

const sameBytes = async (left: Blob, right: Blob): Promise<boolean> => {
	if (left.size !== right.size) return false;
	const [leftBytes, rightBytes] = await Promise.all([
		left.arrayBuffer(),
		right.arrayBuffer(),
	]);
	const leftView = new Uint8Array(leftBytes);
	const rightView = new Uint8Array(rightBytes);
	return leftView.every((byte, index) => byte === rightView[index]);
};

export const writeOutputFile = async (
	relativePath: string,
	content: Blob | string,
): Promise<void> => {
	const nextBlob =
		typeof content === "string"
			? new Blob([content], { type: "text/plain;charset=utf-8" })
			: content;
	try {
		const { directory, fileName } = await getFileDirectory(relativePath);
		const fileHandle = await directory.getFileHandle(fileName, {
			create: true,
		});
		const previousFile = await fileHandle.getFile();
		if (await sameBytes(previousFile, nextBlob)) return;

		const writable = await fileHandle.createWritable();
		try {
			await writable.write(nextBlob);
			await writable.close();
		} catch (error) {
			await writable.abort();
			throw error;
		}

		if (isMobileStorage()) {
			await deleteFromIndexedDB(
				`${OUTPUT_FALLBACK_PREFIX}${relativePath}`,
			);
			const manifest =
				(await getFromIndexedDB<string[]>(
					OUTPUT_FALLBACK_MANIFEST_KEY,
				)) ?? [];
			await saveToIndexedDB(
				OUTPUT_FALLBACK_MANIFEST_KEY,
				manifest.filter((path) => path !== relativePath),
			);
			saveAs(nextBlob, fileName);
		}
	} catch (error) {
		if (!isMobileStorage()) throw error;
		console.error(
			"OPFS output write failed; using IndexedDB fallback:",
			error,
		);
		const fileKey = `${OUTPUT_FALLBACK_PREFIX}${relativePath}`;
		const previous = await getFromIndexedDB<Blob>(fileKey);
		if (previous && (await sameBytes(previous, nextBlob))) return;

		await saveToIndexedDB(fileKey, nextBlob);
		const manifest =
			(await getFromIndexedDB<string[]>(OUTPUT_FALLBACK_MANIFEST_KEY)) ??
			[];
		if (!manifest.includes(relativePath)) {
			await saveToIndexedDB(OUTPUT_FALLBACK_MANIFEST_KEY, [
				...manifest,
				relativePath,
			]);
		}
		saveAs(nextBlob, relativePath.split(/[\\/]/).pop() ?? "download");
	}
};

export const readOutputFile = async (
	relativePath: string,
): Promise<string | null> => {
	try {
		const { directory, fileName } = await getFileDirectory(relativePath);
		const content = await readTextFile(directory, fileName);
		if (content !== null || !isMobileStorage()) return content;
	} catch (error) {
		if (!isMobileStorage()) throw error;
		console.error(
			"OPFS output read failed; checking IndexedDB fallback:",
			error,
		);
	}
	const fallback = await getFromIndexedDB<Blob>(
		`${OUTPUT_FALLBACK_PREFIX}${relativePath}`,
	);
	return fallback ? readBlobAsText(fallback) : null;
};

export const deleteOutputFile = async (relativePath: string): Promise<void> => {
	try {
		const { directory, fileName } = await getFileDirectory(relativePath);
		await directory.removeEntry(fileName);
	} catch (error) {
		if (!isMobileStorage()) {
			if (
				error instanceof DOMException &&
				error.name === "NotFoundError"
			) {
				return;
			}
			throw error;
		}
		if (
			!(error instanceof DOMException && error.name === "NotFoundError")
		) {
			console.error(
				"OPFS output delete failed; using IndexedDB fallback:",
				error,
			);
		}
	}
	if (isMobileStorage()) {
		await saveToIndexedDB(
			OUTPUT_FALLBACK_MANIFEST_KEY,
			(
				(await getFromIndexedDB<string[]>(
					OUTPUT_FALLBACK_MANIFEST_KEY,
				)) ?? []
			).filter((path) => path !== relativePath),
		);
		await deleteFromIndexedDB(`${OUTPUT_FALLBACK_PREFIX}${relativePath}`);
	}
};

export const readOutputFiles = async (
	relativeDirectory: string,
	isMatchingFile: (name: string) => boolean,
): Promise<Array<{ path: string; content: string }>> => {
	const segments = validatePathSegments(relativeDirectory);
	let storedFiles: Array<{ path: string; content: string }> = [];
	try {
		let directory = await getOutputRootDirectory();
		for (const segment of segments) {
			directory = await directory.getDirectoryHandle(segment);
		}

		const scan = async (
			current: FileSystemDirectoryHandle,
			basePath: string,
		): Promise<Array<{ path: string; content: string }>> => {
			const files: Array<{ path: string; content: string }> = [];
			for await (const [name, handle] of (
				current as IterableDirectoryHandle
			).entries()) {
				const path = `${basePath}/${name}`;
				if (handle.kind === "directory") {
					const childDirectory = handle as FileSystemDirectoryHandle;
					files.push(...(await scan(childDirectory, path)));
				} else if (isMatchingFile(name)) {
					const fileHandle = handle as FileSystemFileHandle;
					files.push({
						path,
						content: await (await fileHandle.getFile()).text(),
					});
				}
			}
			return files;
		};

		storedFiles = await scan(directory, segments.join("/"));
	} catch (error) {
		if (!isMobileStorage()) {
			if (
				error instanceof DOMException &&
				error.name === "NotFoundError"
			) {
				return [];
			}
			throw error;
		}
		if (
			!(error instanceof DOMException && error.name === "NotFoundError")
		) {
			console.error(
				"OPFS output scan failed; using IndexedDB fallback:",
				error,
			);
		}
	}

	if (!isMobileStorage()) return storedFiles;
	const manifest =
		(await getFromIndexedDB<string[]>(OUTPUT_FALLBACK_MANIFEST_KEY)) ?? [];
	const storedPaths = new Set(storedFiles.map(({ path }) => path));
	for (const path of manifest) {
		const normalizedPath = path.replace(/\\/g, "/");
		if (
			!normalizedPath.startsWith(`${segments.join("/")}/`) ||
			!isMatchingFile(normalizedPath.split("/").pop() ?? "") ||
			storedPaths.has(normalizedPath)
		) {
			continue;
		}
		const fallback = await getFromIndexedDB<Blob>(
			`${OUTPUT_FALLBACK_PREFIX}${normalizedPath}`,
		);
		if (fallback) {
			storedFiles.push({
				path: normalizedPath,
				content: await readBlobAsText(fallback),
			});
		}
	}
	return storedFiles;
};

export const readMarkdownTree = async (): Promise<(File | Folder)[]> => {
	const files = await readOutputFiles("Markdown", (name) =>
		name.toLowerCase().endsWith(".md"),
	);
	const tree: (File | Folder)[] = [];
	for (const { path, content } of files) {
		const parts = path.split("/").slice(1);
		let level = tree;
		parts.forEach((part, index) => {
			const isFile = index === parts.length - 1;
			if (isFile) {
				level.push({ path: part, type: "file", content });
				return;
			}
			let folder = level.find(
				(item): item is Folder =>
					item.type === "folder" && item.path === part,
			);
			if (!folder) {
				folder = { path: part, type: "folder", children: [] };
				level.push(folder);
			}
			level = folder.children;
		});
	}
	return tree;
};


import JSZip from "jszip";
import { readOutputBlobs, writeOutputFile } from "./outputFiles";

const OUTPUT_DIRECTORIES = [
	"Events",
	"Expenses",
	"Markdown",
	"QR",
	"Imports",
] as const;
type OutputDirectory = (typeof OUTPUT_DIRECTORIES)[number];
const DOWNLOAD_EXTENSIONS: Record<OutputDirectory, ReadonlySet<string>> = {
	Events: new Set([".json", ".png"]),
	Expenses: new Set([".json", ".pdf"]),
	Markdown: new Set([".md", ".pdf", ".json"]),
	QR: new Set([".png"]),
	Imports: new Set([".md", ".pdf", ".json"]),
};
const UPLOAD_EXTENSIONS = new Set([".md", ".pdf", ".json"]);

const getExtension = (name: string): string => {
	const dotIndex = name.lastIndexOf(".");
	return dotIndex < 0 ? "" : name.slice(dotIndex).toLowerCase();
};

export const isSupportedUpload = (file: Pick<File, "name">): boolean =>
	UPLOAD_EXTENSIONS.has(getExtension(file.name));

export const getUploadOutputPath = (fileName: string): string => {
	const name = fileName.split(/[\\/]/).pop() ?? "";
	const monthlyMatch = name.match(
		/^(events|expenses)-(\d{4})-(0[1-9]|1[0-2])\.(json|pdf)$/i,
	);
	if (monthlyMatch) {
		const [, section, year, month, extension] = monthlyMatch;
		if (
			section.toLowerCase() === "events" &&
			extension.toLowerCase() === "json"
		) {
			return `Events/${year}/${month}/${name}`;
		}
		if (section.toLowerCase() === "expenses") {
			return `Expenses/${year}/${month}/${name}`;
		}
	}
	if (name.toLowerCase() === "finance-data.json") {
		return `Expenses/${name}`;
	}
	if (getExtension(name) === ".md" || getExtension(name) === ".pdf") {
		return `Markdown/${name}`;
	}
	return `Imports/${name}`;
};

export const createOutputArchive = async (
	directories: readonly OutputDirectory[] = OUTPUT_DIRECTORIES,
): Promise<Blob | null> => {
	const files = (
		await Promise.all(
			directories.map((directory) =>
				readOutputBlobs(directory, (name) =>
					DOWNLOAD_EXTENSIONS[directory].has(getExtension(name)),
				),
			),
		)
	).flat();
	if (files.length === 0) return null;

	const archive = new JSZip();
	for (const { path, content } of files) {
		archive.file(path, content);
	}
	return archive.generateAsync({ type: "blob" });
};

export const downloadOutputArchive = async (
	directories: readonly OutputDirectory[] = OUTPUT_DIRECTORIES,
	archiveName = "DTD_Tasks.zip",
): Promise<boolean> => {
	const archive = await createOutputArchive(directories);
	if (!archive) return false;
	const file = new globalThis.File([archive], archiveName, {
		type: "application/zip",
	});
	if (navigator.share && navigator.canShare?.({ files: [file] })) {
		await navigator.share({
			files: [file],
			title: archiveName.replace(/\.zip$/i, ""),
		});
		return true;
	}

	const url = URL.createObjectURL(archive);
	const link = document.createElement("a");
	link.href = url;
	link.download = file.name;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	return true;
};

export const downloadJSONFile = async (
	data: unknown,
	fileName: string,
): Promise<void> => {
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json",
	});
	const file = new globalThis.File([blob], fileName, {
		type: "application/json",
	});
	if (navigator.share && navigator.canShare?.({ files: [file] })) {
		await navigator.share({ files: [file], title: fileName });
		return;
	}

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const uploadOutputFiles = async (
	files: File[],
): Promise<{ saved: number; skipped: number }> => {
	let saved = 0;
	let skipped = 0;
	for (const file of files) {
		if (!isSupportedUpload(file)) {
			skipped += 1;
			continue;
		}
		await writeOutputFile(getUploadOutputPath(file.name), file);
		saved += 1;
	}
	return { saved, skipped };
};

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { File, Folder } from "@src/features/markdown/type";
import type { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
import { generateIndividualFilePDF } from "@src/features/markdown/lib/enhancedPDFGenerator";
import { formatTimestamp } from "./common";

export const handleMarkdownExport = async (
	files: (File | Folder)[],
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	try {
		if (!files || files.length === 0) {
			showNotification?.("No files to export", "error");
			return;
		}

		const zip = new JSZip();

		// Create PDF folder
		const pdfFolder = zip.folder("PDF");
		if (!pdfFolder) {
			throw new Error("Failed to create PDF folder");
		}

		// Helper to convert file tree
		interface FileTree {
			type: "file" | "folder";
			path: string;
			content?: string;
			children?: FileTree[];
		}

		const convertToFileTree = (
			items: (File | Folder)[],
			basePath: string = "",
		): FileTree[] => {
			return items.map((item) => {
				const fullPath = basePath
					? `${basePath}/${item.path}`
					: item.path;

				if (item.type === "folder") {
					return {
						path: item.path,
						type: "folder",
						children: convertToFileTree(item.children, fullPath),
					};
				} else {
					return {
						path: item.path,
						type: "file",
						content: item.content,
					};
				}
			});
		};

		const fileTree = convertToFileTree(files);

		const processFileTree = (
			items: FileTree[],
			currentPath: string = "",
		): void => {
			items.forEach((item) => {
				const fullPath = currentPath
					? `${currentPath}/${item.path}`
					: item.path;

				if (item.type === "folder") {
					// Create folder in zip
					zip.folder(fullPath);
					if (item.children) {
						processFileTree(item.children, fullPath);
					}
				} else if (item.content !== undefined) {
					// Add original markdown file
					zip.file(fullPath, item.content);

					// Generate individual PDF with proper encoding
					const fileObj: File = {
						type: "file",
						path: item.path,
						content: item.content,
					};

					const individualPDF = generateIndividualFilePDF(fileObj);

					// Add to PDF folder with .pdf extension
					const pdfFileName = item.path.replace(/\.[^.]+$/, ".pdf");
					const pdfPath = currentPath
						? `${currentPath}/${pdfFileName}`
						: pdfFileName;

					// Use output with proper encoding
					pdfFolder.file(
						pdfPath,
						individualPDF.output("arraybuffer"),
					);
				}
			});
		};

		processFileTree(fileTree);

		// Add JSON for re-import (in root)
		zip.file("file-manager-data.json", JSON.stringify({ files }, null, 2));

		// Add metadata
		const createMetadata = (section: string, dataCount: number) => {
			return {
				section,
				exportDate: new Date().toISOString(),
				itemCount: dataCount,
				version: "1.0.0",
				appName: "List Manager",
			};
		};

		zip.file(
			"meta.json",
			JSON.stringify(
				createMetadata("FileManager", files.length),
				null,
				2,
			),
		);

		const blob = await zip.generateAsync({ type: "blob" });

		saveAs(blob, `markdown-export_${formatTimestamp()}.zip`);
		showNotification?.("Files exported successfully", "success");
	} catch (error) {
		console.error("Markdown export error:", error);
		showNotification?.("Failed to export files", "error");
	}
};


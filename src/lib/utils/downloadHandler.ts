import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
	AppState,
	ExpensesData,
	FileTree,
	Metadata,
	ShowNotificationFn,
} from "@src/lib/types/downloadHandlerTypes";
import { File, Folder } from "@src/features/markdown/type";
import {
	ExpenseEntry,
	FinanceState,
	SimulatedExpense,
} from "@src/features/finance/type";
import { generateIndividualFilePDF } from "@src/features/markdown/lib/enhancedPDFGenerator";
import {
	buildFinanceBackup,
	FINANCE_BACKUP_FILE,
} from "@src/features/finance/lib/financeBackup";
import {
	buildExpenseReport,
	getMonthLabel,
} from "@src/features/finance/lib/expenseReport";
import { renderExpenseReportPdf } from "@src/features/finance/lib/expenseReportPdf";
import { formatISODate } from "@src/lib/utils/isoDate";
import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";
import {
	TIMELINE_BACKUP_FILE,
	type TimelineBackup,
} from "@src/features/home/lib/timelineBackup";

import {
	BOARDS_BACKUP_FILE,
	type BoardsBackup,
} from "@src/features/nodes/lib/boardBackup";
import type { BoardExports } from "@src/features/nodes/lib/boardExport";

export type FinanceExportReportScope = "allMonths" | "lastTwoMonths";

const formatTimestamp = (): string => {
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.slice(0, -5);
	return timestamp;
};

const createMetadata = (section: string, dataCount: number): Metadata => {
	return {
		section,
		exportDate: new Date().toISOString(),
		itemCount: dataCount,
		version: "1.0.0",
		schemaVersion: SCHEMA_VERSION,
		appName: "List Manager",
	};
};

const convertToFileTree = (
	items: (File | Folder)[],
	basePath: string = "",
): FileTree[] => {
	return items.map((item) => {
		const fullPath = basePath ? `${basePath}/${item.path}` : item.path;

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

interface EstimatedData {
	simulatedExpenses: SimulatedExpense[];
	totalEstimatedPrice?: number;
}

const generateEstimatedPDF = ({
	simulatedExpenses,
	totalEstimatedPrice,
}: EstimatedData): jsPDF => {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const marginLeft = 14;
	const marginTop = 20;
	const lineHeight = 7;

	let yPos = marginTop;

	// --- Title ---
	doc.setFontSize(18);
	doc.setFont("helvetica", "bold");
	doc.text("Estimated Expense Report", pageWidth / 2, yPos, {
		align: "center",
	});

	yPos += 10;
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(
		`Generated: ${new Date().toLocaleDateString()}`,
		pageWidth / 2,
		yPos,
		{ align: "center" },
	);

	yPos += 15;

	// --- Table Header ---
	doc.setFontSize(11);
	doc.setFont("helvetica", "bold");
	doc.text("Name", marginLeft, yPos);
	doc.text("Qty", marginLeft + 80, yPos);
	doc.text("Unit", marginLeft + 110, yPos);
	doc.text("Amount", marginLeft + 140, yPos);

	yPos += 3;
	doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
	yPos += 4;

	// --- Table Rows ---
	doc.setFont("helvetica", "normal");
	simulatedExpenses.forEach((item) => {
		// Check if next line fits, else add new page
		if (yPos + lineHeight > pageHeight - 20) {
			doc.addPage();
			yPos = marginTop;

			// Re-add table header on new page
			doc.setFontSize(11);
			doc.setFont("helvetica", "bold");
			doc.text("Name", marginLeft, yPos);
			doc.text("Qty", marginLeft + 80, yPos);
			doc.text("Unit", marginLeft + 110, yPos);
			doc.text("Amount", marginLeft + 140, yPos);
			yPos += 3;
			doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
			yPos += 4;
			doc.setFont("helvetica", "normal");
		}

		const qtyText = item.quantity ? item.quantity.toString() : "-";
		const amountText = item.amount.toFixed(2);

		doc.text(item.name, marginLeft, yPos);
		doc.text(qtyText, marginLeft + 80, yPos);
		doc.text(item.unit || "-", marginLeft + 110, yPos);
		doc.text(amountText, marginLeft + 140, yPos);

		yPos += lineHeight;
	});

	yPos += 10;

	// Add new page if summary won't fit
	if (yPos + lineHeight > pageHeight - 20) {
		doc.addPage();
		yPos = marginTop;
	}

	doc.setFont("helvetica", "bold");
	doc.text("Estimated Summary", marginLeft, yPos);
	yPos += lineHeight;
	doc.text(
		`Total Estimated Price: ${totalEstimatedPrice?.toFixed(2)}`,
		marginLeft + 10,
		yPos,
	);

	return doc;
};

interface ExpenseReportFile {
	fileName: string;
	pdf: jsPDF;
}

const getExpenseMonthKeys = (expenses: ExpenseEntry[]): string[] => {
	const monthKeys = new Set(
		expenses.map((expense) => expense.date.substring(0, 7)),
	);

	return Array.from(monthKeys).sort((a, b) => b.localeCompare(a));
};

const getLastTwoMonthKeys = (): string[] => {
	const today = new Date();

	return [0, 1].map((monthsBack) => {
		const date = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
		return formatISODate(date).substring(0, 7);
	});
};

const buildExpenseReportFiles = (
	financeData: FinanceState | undefined,
	expensesData: ExpensesData,
	reportScope: FinanceExportReportScope,
): ExpenseReportFile[] => {
	const allExpenses = expensesData.expenses || [];

	const monthReport = (monthKey: string): ExpenseReportFile => ({
		fileName: `expenses-report-${monthKey}.pdf`,
		pdf: renderExpenseReportPdf(
			buildExpenseReport({
				financeData,
				allExpenses,
				monthKey,
				title: `Expense Report - ${getMonthLabel(monthKey)}`,
			}),
		),
	});

	if (reportScope === "lastTwoMonths") {
		return getLastTwoMonthKeys().map(monthReport);
	}

	return [
		{
			fileName: "expenses-report-all-months.pdf",
			pdf: renderExpenseReportPdf(
				buildExpenseReport({
					financeData,
					allExpenses,
					title: "Expense Report - All Months",
				}),
			),
		},
		...getExpenseMonthKeys(allExpenses).map(monthReport),
	];
};

export const handleFinanceExport = async (
	financeData: FinanceState | undefined,
	expensesData: ExpensesData,
	simulatedData?: SimulatedExpense[],
	totalSimulatedCost?: number,
	showNotification?: ShowNotificationFn,
	reportScope: FinanceExportReportScope = "allMonths",
): Promise<void> => {
	if (
		!financeData &&
		!expensesData?.expenses &&
		!simulatedData?.length
	) {
		showNotification?.("No finance data to export", "error");
		return;
	}

	try {
		const zip = new JSZip();

		// Finance + expenses in one restorable file
		if (financeData || expensesData?.expenses) {
			zip.file(
				FINANCE_BACKUP_FILE,
				JSON.stringify(
					buildFinanceBackup(financeData, expensesData),
					null,
					2,
				),
			);
		}

		if (expensesData?.expenses) {
			const reportsFolder = zip.folder("reports");
			if (!reportsFolder) {
				throw new Error("Failed to create reports folder");
			}

			buildExpenseReportFiles(
				financeData,
				expensesData,
				reportScope,
			).forEach((report) => {
				reportsFolder.file(report.fileName, report.pdf.output("blob"));
			});
		}

		if (simulatedData?.length) {
			const estimatedPDF = generateEstimatedPDF({
				simulatedExpenses: simulatedData,
				totalEstimatedPrice: totalSimulatedCost,
			});

			zip.file(`estimated-prices.pdf`, estimatedPDF.output("blob"));
		}

		// Metadata
		zip.file(
			"meta.json",
			JSON.stringify(
				createMetadata("Finance", expensesData?.expenses?.length || 0),
				null,
				2,
			),
		);

		// Save ZIP
		const blob = await zip.generateAsync({ type: "blob" });
		saveAs(blob, `expense-export_${formatTimestamp()}.zip`);
		showNotification?.("Expense data exported successfully", "success");
	} catch (error) {
		console.error("Finance export error:", error);
		showNotification?.("Failed to export finance data", "error");
	}
};

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
					const fileObj = {
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
		zip.file(
			"file-manager-data.json",
			JSON.stringify({ schemaVersion: SCHEMA_VERSION, files }, null, 2),
		);

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

/** JPG has no transparency, so the picture is drawn on white first (it would turn black otherwise). */
const flattenOnWhite = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
	const flat = document.createElement("canvas");
	flat.width = canvas.width;
	flat.height = canvas.height;
	const ctx = flat.getContext("2d");
	if (!ctx) return canvas;
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, flat.width, flat.height);
	ctx.drawImage(canvas, 0, 0);
	return flat;
};

export const handleQRExport = async (
	canvas: HTMLCanvasElement | null,
	showNotification?: ShowNotificationFn,
	format: "png" | "jpg" = "png",
): Promise<void> => {
	if (!canvas) {
		showNotification?.("QR Code not generated yet", "error");
		return;
	}

	try {
		const source = format === "jpg" ? flattenOnWhite(canvas) : canvas;
		const done = (blob: Blob | null) => {
			if (blob) {
				saveAs(blob, `qr-code_${formatTimestamp()}.${format}`);
				showNotification?.(
					"QR Code downloaded successfully",
					"success",
				);
			}
		};
		if (format === "jpg") source.toBlob(done, "image/jpeg", 0.92);
		else source.toBlob(done);
	} catch (error) {
		console.error("QR export error:", error);
		showNotification?.("Failed to export QR code", "error");
	}
};

/** Timeline (journal notes with images, plus markdown activity) as one JSON file. */
export const handleTimelineExport = async (
	backup: TimelineBackup,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	try {
		const blob = new Blob([JSON.stringify(backup, null, 2)], {
			type: "application/json",
		});
		saveAs(blob, `timeline-backup_${formatTimestamp()}.json`);
		showNotification?.("Timeline exported successfully", "success");
	} catch (error) {
		console.error("Timeline export error:", error);
		showNotification?.("Failed to export timeline", "error");
	}
};

/**
 * Boards as one ZIP: the JSON backup (always) and a picture of each board in
 * Images/. Only the JSON is used to restore.
 */
export const handleBoardsExport = async (
	backup: BoardsBackup,
	pictures?: BoardExports,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	try {
		const zip = new JSZip();
		zip.file(BOARDS_BACKUP_FILE, JSON.stringify(backup, null, 2));
		const imagesFolder = zip.folder("Images");
		pictures?.images.forEach((file) => imagesFolder?.file(file.fileName, file.blob));
		saveAs(await zip.generateAsync({ type: "blob" }), `boards-export_${formatTimestamp()}.zip`);
		showNotification?.("Boards exported successfully", "success");
	} catch (error) {
		console.error("Boards export error:", error);
		showNotification?.("Failed to export boards", "error");
	}
};

export const handleFullAppExport = async (
	appState: AppState,
	showNotification?: ShowNotificationFn,
	timeline?: TimelineBackup,
	boards?: BoardsBackup,
	boardPictures?: BoardExports,
): Promise<void> => {
	try {
		const zip = new JSZip();
		let totalItems = 0;
		let hasData = false;

		// Finance & Expenses
		if (appState.finance || appState.expenses?.expenses?.length) {
			hasData = true;
			const financeFolder = zip.folder("Finance");

			financeFolder?.file(
				FINANCE_BACKUP_FILE,
				JSON.stringify(
					buildFinanceBackup(appState.finance, appState.expenses),
					null,
					2,
				),
			);
			if (appState.finance) totalItems++;

			if (appState.expenses?.expenses?.length) {
				const expensesPDF = renderExpenseReportPdf(
					buildExpenseReport({
						financeData: appState.finance,
						allExpenses: appState.expenses.expenses,
						title: "Expense Report - All Months",
					}),
				);
				financeFolder?.file(
					"expenses-report.pdf",
					expensesPDF.output("blob"),
				);

				totalItems += appState.expenses.expenses.length;
			}
		}

		// File Manager (Markdown)
		if (appState.fileManager?.files?.length) {
			hasData = true;
			const fileManagerFolder = zip.folder("Markdown");
			const fileTree = convertToFileTree(appState.fileManager.files);

			const processFiles = (
				items: FileTree[],
				currentPath: string = "",
			): void => {
				items.forEach((item) => {
					const fullPath = currentPath
						? `${currentPath}/${item.path}`
						: item.path;

					if (item.type === "folder" && item.children) {
						processFiles(item.children, fullPath);
					} else if (
						item.type === "file" &&
						item.content !== undefined
					) {
						fileManagerFolder?.file(fullPath, item.content);
						totalItems++;
					}
				});
			};

			processFiles(fileTree);
			fileManagerFolder?.file(
				"file-manager-data.json",
				JSON.stringify(
					{ schemaVersion: SCHEMA_VERSION, ...appState.fileManager },
					null,
					2,
				),
			);
		}

		// Timeline (journal + markdown activity; expenses export with Finance)
		const timelineRows =
			(timeline?.journal.length ?? 0) + (timeline?.markdownLog.length ?? 0);
		if (timeline && timelineRows > 0) {
			hasData = true;
			zip.folder("Timeline")?.file(
				TIMELINE_BACKUP_FILE,
				JSON.stringify(timeline, null, 2),
			);
			totalItems += timelineRows;
		}

		// Boards (Nodes page)
		if (boards && boards.boards.length > 0) {
			hasData = true;
			const boardsFolder = zip.folder("Boards");
			boardsFolder?.file(
				BOARDS_BACKUP_FILE,
				JSON.stringify(boards, null, 2),
			);
			// Pictures sit beside the JSON; only the JSON is used to restore.
			const imagesFolder = boardsFolder?.folder("Images");
			boardPictures?.images.forEach((file) =>
				imagesFolder?.file(file.fileName, file.blob),
			);
			totalItems += boards.boards.length;
		}

		// QR - Skip (user exports manually from QR page)

		if (!hasData) {
			showNotification?.("No data available to export", "error");
			return;
		}

		// Global Metadata
		zip.file(
			"meta.json",
			JSON.stringify(createMetadata("AllData", totalItems), null, 2),
		);
		zip.file(
			"README.txt",
			`List Manager - Full Data Export
Generated: ${new Date().toLocaleString()}
Total Items: ${totalItems}

Folders:
- Finance: Balance, expenses, and PDF report
- Markdown: Files and folders
- Timeline: Journal notes (with images) and markdown activity
- Boards: Nodes & Notes boards

To restore data:
1. Go to the specific page (Finance/Markdown)
2. Click "Upload JSON" and select the file (Finance: finance-backup.json)
3. Timeline: on Home, click "Import" and select ${TIMELINE_BACKUP_FILE}
4. Boards: on the Nodes page, click "Upload JSON" and select ${BOARDS_BACKUP_FILE}
5. QR codes must be regenerated manually
`,
		);

		const blob = await zip.generateAsync({ type: "blob" });
		saveAs(blob, `list-manager-full-export_${formatTimestamp()}.zip`);
		showNotification?.("All data exported successfully", "success");
	} catch (error) {
		console.error("Full app export error:", error);
		showNotification?.("Failed to export all data", "error");
	}
};

export const handleJSONUpload = async <T = unknown>(
	file: globalThis.File,
	onSuccess: (data: T) => void,
	onError?: (error: string) => void,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	try {
		const text = await file.text();
		const data = JSON.parse(text) as T;

		if (typeof data !== "object" || data === null) {
			throw new Error("Invalid JSON structure");
		}

		onSuccess(data);
		showNotification?.("Data restored successfully", "success");
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Invalid JSON file";
		console.error("JSON Upload Error:", errorMessage);
		showNotification?.(errorMessage, "error");
		onError?.(errorMessage);
	}
};


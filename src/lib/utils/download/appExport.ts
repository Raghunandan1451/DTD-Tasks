
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { AppState, FileTree, ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";


import { buildFinanceBackup, FINANCE_BACKUP_FILE } from "@src/features/finance/lib/financeBackup";
import { buildExpenseReport } from "@src/features/finance/lib/expenseReport";
import { renderExpenseReportPdf } from "@src/features/finance/lib/expenseReportPdf";

import { SCHEMA_VERSION } from "@src/lib/utils/schemaVersion";
import { TIMELINE_BACKUP_FILE, type TimelineBackup } from "@src/features/home/lib/timelineBackup";

import { BOARDS_BACKUP_FILE, type BoardsBackup } from "@src/features/nodes/lib/boardBackup";
import type { BoardExports } from "@src/features/nodes/lib/boardExport";

import { formatTimestamp, createMetadata, convertToFileTree } from "@src/lib/utils/download/shared";

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

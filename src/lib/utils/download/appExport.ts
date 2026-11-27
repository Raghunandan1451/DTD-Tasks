
import JSZip from "jszip";
import { saveFile, savedTo } from "@src/lib/utils/saveFile";
import { AppState, ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";


import { buildExpenseReport } from "@src/features/finance/lib/expenseReport";
import { renderExpenseReportPdf } from "@src/features/finance/lib/expenseReportPdf";

import type { TimelineBackup } from "@src/features/home/lib/timelineBackup";

import { BOARDS_BACKUP_FILE, type BoardsBackup } from "@src/features/nodes/lib/boardBackup";
import type { BoardExports } from "@src/features/nodes/lib/boardExport";

import { formatTimestamp } from "@src/lib/utils/download/shared";
import { buildFolderFiles } from "@src/lib/utils/download/folderLayout";
import { BOARDS_ROOT, FINANCE_ROOT } from "@src/lib/storage/folder/fileNames";
import type { File as NoteFile, Folder as NoteFolder } from "@src/features/markdown/type";

const countNotes = (items: (NoteFile | NoteFolder)[]): number =>
	items.reduce((n, item) => n + (item.type === "folder" ? countNotes(item.children) : 1), 0);

/** Timeline (journal notes, plus markdown activity) as one JSON file. */
export const handleTimelineExport = async (
	backup: TimelineBackup,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	try {
		const blob = new Blob([JSON.stringify(backup, null, 2)], {
			type: "application/json",
		});
		const saved = await saveFile(blob, `timeline-backup_${formatTimestamp()}.json`);
		if (saved.cancelled) return;
		showNotification?.(`Timeline exported successfully${savedTo(saved.path)}`, "success");
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
		const saved = await saveFile(await zip.generateAsync({ type: "blob" }), `boards-export_${formatTimestamp()}.zip`);
		if (saved.cancelled) return;
		showNotification?.(`Boards exported successfully${savedTo(saved.path)}`, "success");
	} catch (error) {
		console.error("Boards export error:", error);
		showNotification?.("Failed to export boards", "error");
	}
};

/**
 * Everything the person picked as one ZIP laid out like a desktop data folder:
 * Notes/, Boards/, Finance/, Journal/ and .dtdtasks/. Unzip it into the desktop
 * data folder, or import it in either version. Boards also bring a picture each
 * (Boards/Images/) and Finance a PDF report; both are only for reading.
 */
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

		const hasExpenses = !!appState.expenses?.expenses?.length;
		const hasNotes = !!appState.fileManager?.files?.length;
		const hasBoards = !!boards && boards.boards.length > 0;
		const timelineRows =
			(timeline?.journal.length ?? 0) + (timeline?.markdownLog.length ?? 0);

		if (!appState.finance && !hasExpenses && !hasNotes && !hasBoards && timelineRows === 0) {
			showNotification?.("No data available to export", "error");
			return;
		}

		const layout = await buildFolderFiles({
			notes: hasNotes ? appState.fileManager : undefined,
			boards: hasBoards ? boards.boards : undefined,
			finance: appState.finance,
			expenses: hasExpenses ? appState.expenses : undefined,
			journal: timeline?.journal,
			activity: timeline?.markdownLog,
		});
		for (const [path, text] of layout.files) zip.file(path, text);

		if (appState.finance) totalItems++;
		if (hasExpenses) {
			totalItems += appState.expenses?.expenses.length ?? 0;
			// A readable report next to the data; only the JSON files are used to restore.
			const report = renderExpenseReportPdf(
				buildExpenseReport({
					financeData: appState.finance,
					allExpenses: appState.expenses?.expenses ?? [],
					title: "Expense Report - All Months",
				}),
			);
			zip.file(`${FINANCE_ROOT}/expenses-report.pdf`, report.output("blob"));
		}
		if (hasNotes) totalItems += countNotes(appState.fileManager?.files ?? []);
		totalItems += timelineRows;
		if (hasBoards) {
			totalItems += boards.boards.length;
			const images = zip.folder(`${BOARDS_ROOT}/Images`);
			boardPictures?.images.forEach((file) => images?.file(file.fileName, file.blob));
		}

		zip.file(
			"README.txt",
			`DTDTasks - data export
Generated: ${new Date().toLocaleString()}
Items: ${totalItems}

This ZIP is laid out exactly like a DTDTasks desktop data folder:
- Notes/      your notes as .md files
- Boards/     one .board.json file per board (Images/ holds a picture of each, for reading only)
- Finance/    settings.json and expenses/YYYY-MM.json (plus a PDF report, for reading only)
- Journal/    one file per day
- .dtdtasks/  the folder's own bookkeeping

To use it:
- Desktop: unzip it into your data folder (or an empty folder, then choose that folder), or use Import on Home.
- Browser: use Import on Home and choose this ZIP.
QR codes are not included; save them from the QR page.
`,
		);

		const blob = await zip.generateAsync({ type: "blob" });
		const saved = await saveFile(blob, `dtdtasks-data_${formatTimestamp()}.zip`);
		if (saved.cancelled) return;
		showNotification?.(`Data exported successfully${savedTo(saved.path)}`, "success");
	} catch (error) {
		console.error("Full app export error:", error);
		showNotification?.("Failed to export data", "error");
	}
};

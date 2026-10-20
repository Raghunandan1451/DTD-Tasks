import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { AppState, FileTree, ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
import { generateWeeklyCalendarScreenshot } from "@src/features/event/lib/utils";
import { createICS, createMetadata, convertToFileTree, formatTimestamp } from "./common";
import { generateExpensesPDF } from "./expenseReports";

export const handleFullAppExport = async (
	appState: AppState,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	try {
		const zip = new JSZip();
		let totalItems = 0;
		let hasData = false;

		// Calendar
		if (appState.calendar?.events?.length) {
			hasData = true;
			const calendarFolder = zip.folder("Calendar");

			calendarFolder?.file(
				"calendar-data.json",
				JSON.stringify(appState.calendar, null, 2),
			);
			calendarFolder?.file(
				"calendar.ics",
				createICS(appState.calendar.events),
			);

			// Add weekly screenshot
			const screenshot = await generateWeeklyCalendarScreenshot(
				appState.calendar.events,
				appState.calendar.currentDate,
			);
			if (screenshot) {
				calendarFolder?.file("weekly-schedule.png", screenshot);
			}

			totalItems += appState.calendar.events.length;
		}

		// Finance & Expenses
		if (appState.finance || appState.expenses?.expenses?.length) {
			hasData = true;
			const financeFolder = zip.folder("Finance");

			if (appState.finance) {
				financeFolder?.file(
					"finance-data.json",
					JSON.stringify(appState.finance, null, 2),
				);
				totalItems++;
			}

			if (appState.expenses?.expenses?.length) {
				financeFolder?.file(
					"expenses-data.json",
					JSON.stringify(appState.expenses, null, 2),
				);

				const expensesPDF = generateExpensesPDF(appState.expenses, {
					title: "Expense Report - All Months",
					initialBalance: appState.finance?.currentBalance ?? 0,
					allExpenses: appState.expenses.expenses,
				});
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
				JSON.stringify(appState.fileManager, null, 2),
			);
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
- Calendar: Events and .ics file
- Finance: Balance, expenses, and PDF report
- Markdown: Files and folders

To restore data:
1. Go to the specific page (Calendar/Finance/Markdown)
2. Click "Import" and select the corresponding JSON file
3. QR codes must be regenerated manually
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

import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
	AppState,
	CalendarData,
	ExpensesData,
	FileTree,
	Metadata,
	ShowNotificationFn,
} from "@src/lib/types/downloadHandlerTypes";
import { File, Folder } from "@src/features/markdown/type";
import { FinanceState, SimulatedExpense } from "@src/features/finance/type";
import { Event } from "@src/features/event/type";
import { generateWeeklyCalendarScreenshot } from "@src/features/event/lib/utils";
import { generateIndividualFilePDF } from "@src/features/markdown/lib/enhancedPDFGenerator";

const formatTimestamp = (): string => {
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.slice(0, -5);
	return timestamp;
};

const createICS = (events: Event[]): string => {
	const header = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ListManager//EN\nCALSCALE:GREGORIAN`;
	const body = events
		.map((ev) => {
			const formatDate = (date: string) => date.replace(/-/g, "");
			return `BEGIN:VEVENT\nUID:${ev.id}@listmanager\nSUMMARY:${
				ev.title || "Event"
			}\nDTSTART;VALUE=DATE:${formatDate(ev.startDate)}\nDTEND;VALUE=DATE:${formatDate(ev.endDate)}\nDESCRIPTION:${
				ev.content || ""
			}\nCATEGORIES:${ev.tag}\nSTATUS:CONFIRMED\nEND:VEVENT`;
		})
		.join("\n");
	const footer = "END:VCALENDAR";
	return `${header}\n${body}\n${footer}`;
};

const createMetadata = (section: string, dataCount: number): Metadata => {
	return {
		section,
		exportDate: new Date().toISOString(),
		itemCount: dataCount,
		version: "1.0.0",
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

const generateExpensesPDF = (expenses: ExpensesData): jsPDF => {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	const marginLeft = 14;
	const lineHeight = 7;

	doc.setFontSize(18);
	doc.text("Expense Report", pageWidth / 2, 20, { align: "center" });
	doc.setFontSize(10);
	doc.text(
		`Generated: ${new Date().toLocaleDateString()}`,
		pageWidth / 2,
		28,
		{ align: "center" },
	);

	// Group by month first, then by date within month
	const expensesByMonth = expenses.expenses.reduce(
		(acc, exp) => {
			const monthKey = exp.date.substring(0, 7); // "YYYY-MM"
			if (!acc[monthKey]) acc[monthKey] = {};
			if (!acc[monthKey][exp.date]) acc[monthKey][exp.date] = [];
			acc[monthKey][exp.date].push(exp);
			return acc;
		},
		{} as Record<string, Record<string, typeof expenses.expenses>>,
	);

	let yPos = 40;

	const sortedMonths = Object.keys(expensesByMonth).sort(
		(a, b) => new Date(b).getTime() - new Date(a).getTime(),
	);

	sortedMonths.forEach((monthKey) => {
		const monthDates = expensesByMonth[monthKey];

		// Page break check for month header
		if (yPos > 250) {
			doc.addPage();
			yPos = 20;
		}

		// Month header
		const monthLabel = new Date(monthKey + "-01").toLocaleDateString(
			"en-US",
			{ month: "long", year: "numeric" },
		);
		doc.setFontSize(14);
		doc.setFont("helvetica", "bold");
		doc.setFillColor(240, 240, 240);
		doc.rect(marginLeft - 2, yPos - 5, pageWidth - 24, 10, "F");
		doc.text(monthLabel, marginLeft, yPos);
		yPos += 10;

		const sortedDates = Object.keys(monthDates).sort(
			(a, b) => new Date(b).getTime() - new Date(a).getTime(),
		);

		let monthDebit = 0;
		let monthCredit = 0;

		sortedDates.forEach((date) => {
			const exps = monthDates[date];

			if (yPos > 260) {
				doc.addPage();
				yPos = 20;
			}

			// Date subheader
			doc.setFontSize(11);
			doc.setFont("helvetica", "bold");
			doc.text(
				new Date(date).toLocaleDateString("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
				}),
				marginLeft + 4,
				yPos,
			);
			yPos += 6;

			// Table header
			doc.setFontSize(9);
			doc.setFont("helvetica", "bold");
			doc.text("Name", marginLeft + 4, yPos);
			doc.text("Group", marginLeft + 54, yPos);
			doc.text("Qty", marginLeft + 104, yPos);
			doc.text("Amount", marginLeft + 134, yPos);
			doc.text("Type", marginLeft + 164, yPos);
			yPos += 3;
			doc.line(marginLeft + 4, yPos, pageWidth - marginLeft, yPos);
			yPos += 3;

			// Rows
			doc.setFont("helvetica", "normal");
			exps.forEach((exp) => {
				if (yPos > 270) {
					doc.addPage();
					yPos = 20;
				}
				const qty = exp.quantity
					? `${exp.quantity} ${exp.unit || ""}`
					: "-";
				const amount =
					exp.type === "Cr" ? `+${exp.amount}` : `-${exp.amount}`;

				if (exp.type === "Cr") monthCredit += exp.amount;
				else monthDebit += exp.amount;

				doc.text(exp.name.substring(0, 25), marginLeft + 4, yPos);
				doc.text(exp.group.substring(0, 20), marginLeft + 54, yPos);
				doc.text(qty, marginLeft + 104, yPos);
				doc.text(amount, marginLeft + 134, yPos);
				doc.text(exp.type || "Dr", marginLeft + 164, yPos);
				yPos += lineHeight;
			});

			yPos += 4;
		});

		// Monthly summary box
		if (yPos > 255) {
			doc.addPage();
			yPos = 20;
		}

		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");
		doc.setFillColor(250, 250, 250);
		doc.rect(marginLeft, yPos, pageWidth - 28, 22, "FD");
		yPos += 6;
		doc.text(`${monthLabel} Summary`, marginLeft + 4, yPos);
		yPos += 6;
		doc.setFont("helvetica", "normal");
		doc.text(
			`Credits: +${monthCredit.toFixed(2)}   Debits: -${monthDebit.toFixed(2)}   Net: ${(monthCredit - monthDebit).toFixed(2)}`,
			marginLeft + 4,
			yPos,
		);
		yPos += 14;
	});

	// Overall summary
	const totalDebit = expenses.expenses
		.filter((e) => e.type !== "Cr")
		.reduce((sum, e) => sum + e.amount, 0);
	const totalCredit = expenses.expenses
		.filter((e) => e.type === "Cr")
		.reduce((sum, e) => sum + e.amount, 0);

	if (yPos > 250) {
		doc.addPage();
		yPos = 20;
	}

	yPos += 4;
	doc.setFontSize(11);
	doc.setFont("helvetica", "bold");
	doc.setFillColor(230, 230, 230);
	doc.rect(marginLeft - 2, yPos - 5, pageWidth - 24, 30, "F");
	doc.text("Overall Summary", marginLeft, yPos);
	yPos += lineHeight;
	doc.setFont("helvetica", "normal");
	doc.text(`Total Credits: +${totalCredit.toFixed(2)}`, marginLeft + 4, yPos);
	yPos += lineHeight;
	doc.text(`Total Debits: -${totalDebit.toFixed(2)}`, marginLeft + 4, yPos);
	yPos += lineHeight;
	doc.setFont("helvetica", "bold");
	doc.text(
		`Net Balance: ${(totalCredit - totalDebit).toFixed(2)}`,
		marginLeft + 4,
		yPos,
	);

	return doc;
};

interface EstimatedData {
	simulatedExpenses: SimulatedExpense[];
	totalEstimatedPrice?: number;
}

export const generateEstimatedPDF = ({
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

export const handleCalendarExport = async (
	calendarData: CalendarData,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	const events = calendarData?.events || [];

	if (!events.length) {
		showNotification?.("No calendar events to export", "error");
		return;
	}

	try {
		const zip = new JSZip();

		// Add calendar JSON
		zip.file("calendar-data.json", JSON.stringify(calendarData, null, 2));

		// Add ICS file
		const icsContent = createICS(events);
		zip.file("calendar.ics", icsContent);

		// Add weekly screenshot
		const screenshot = await generateWeeklyCalendarScreenshot(
			events,
			calendarData.currentDate,
		);
		if (screenshot) {
			zip.file("weekly-schedule.png", screenshot);
		} else {
			console.warn("Screenshot generation failed");
		}

		// Add metadata
		zip.file(
			"meta.json",
			JSON.stringify(
				{
					type: "Calendar",
					count: events.length,
					exportedAt: new Date().toISOString(),
				},
				null,
				2,
			),
		);

		const blob = await zip.generateAsync({ type: "blob" });

		saveAs(blob, `calendar-export_${formatTimestamp()}.zip`);
		showNotification?.("Calendar exported successfully", "success");
	} catch (error) {
		console.error("Calendar export error:", error);
		showNotification?.("Failed to export calendar", "error");
	}
};

export const handleFinanceExport = async (
	financeData: FinanceState,
	expensesData: ExpensesData,
	simulatedData?: SimulatedExpense[],
	totalSimulatedCost?: number,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	if (
		!financeData &&
		!expensesData?.expenses?.length &&
		!simulatedData?.length
	) {
		showNotification?.("No finance data to export", "error");
		return;
	}

	try {
		const zip = new JSZip();

		// Finance data
		if (financeData) {
			zip.file("finance-data.json", JSON.stringify(financeData, null, 2));
		}

		// Expenses data
		if (expensesData?.expenses?.length) {
			zip.file(
				"expenses-data.json",
				JSON.stringify(expensesData, null, 2),
			);

			const expensesPDF = generateExpensesPDF(expensesData);
			zip.file("expenses-report.pdf", expensesPDF.output("blob"));
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

export const handleQRExport = async (
	canvas: HTMLCanvasElement | null,
	showNotification?: ShowNotificationFn,
): Promise<void> => {
	if (!canvas) {
		showNotification?.("QR Code not generated yet", "error");
		return;
	}

	try {
		canvas.toBlob((blob) => {
			if (blob) {
				saveAs(blob, `qr-code_${formatTimestamp()}.png`);
				showNotification?.(
					"QR Code downloaded successfully",
					"success",
				);
			}
		});
	} catch (error) {
		console.error("QR export error:", error);
		showNotification?.("Failed to export QR code", "error");
	}
};

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

				// Generate tabular PDF
				const expensesPDF = generateExpensesPDF(appState.expenses);
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

/** @deprecated Use handleMarkdownExport instead */
export const handleZIPExport = handleMarkdownExport;

/** @deprecated Use handleFinanceExport instead */
export const handleFinanceDownload = handleFinanceExport;

/** @deprecated Use handleCalendarExport instead */
export const handleCalendarDownload = handleCalendarExport;

/** @deprecated Use handleQRExport instead */
export const handleDownloadImage = handleQRExport;

/** @deprecated Use handleFullAppExport instead */
export const handleFullAppDownload = handleFullAppExport;

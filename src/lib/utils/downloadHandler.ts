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
import {
	ExpenseEntry,
	FinanceState,
	SimulatedExpense,
} from "@src/features/finance/type";
import { Event } from "@src/features/event/type";
import { generateWeeklyCalendarScreenshot } from "@src/features/event/lib/utils";
import { generateIndividualFilePDF } from "@src/features/markdown/lib/enhancedPDFGenerator";

export type FinanceExportReportScope = "allMonths" | "lastTwoMonths";

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

interface GenerateExpensesPDFOptions {
	title?: string;
	monthKey?: string;
	initialBalance?: number;
	allExpenses?: ExpenseEntry[];
}

interface BalanceTrendPoint {
	date: string;
	balance: number;
	credit: number;
	debit: number;
}

const chartColors = [
	[59, 130, 246],
	[16, 185, 129],
	[245, 158, 11],
	[239, 68, 68],
	[139, 92, 246],
	[236, 72, 153],
	[6, 182, 212],
	[132, 204, 22],
];

const formatISODate = (date: Date): string => {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const parseISODate = (date: string): Date => {
	return new Date(`${date}T00:00:00`);
};

const formatCurrency = (value: number): string => {
	return value.toLocaleString("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	});
};

const getExpenseNet = (expense: ExpenseEntry): number => {
	return expense.type === "Cr" ? expense.amount : -expense.amount;
};

const getMonthLabel = (monthKey: string): string => {
	return parseISODate(`${monthKey}-01`).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
};

const getMonthRange = (monthKey: string): { start: Date; end: Date } => {
	const [year, month] = monthKey.split("-").map(Number);
	const start = new Date(year, month - 1, 1);
	const end = new Date(year, month, 0);
	const today = new Date();

	if (
		start.getFullYear() === today.getFullYear() &&
		start.getMonth() === today.getMonth()
	) {
		return { start, end: today < end ? today : end };
	}

	return { start, end };
};

const generateDateRange = (start: Date, end: Date): string[] => {
	const dates: string[] = [];
	const current = new Date(start);

	while (current <= end) {
		dates.push(formatISODate(current));
		current.setDate(current.getDate() + 1);
	}

	return dates;
};

const buildBalanceTrendData = (
	allExpenses: ExpenseEntry[],
	initialBalance: number,
	monthKey?: string,
): BalanceTrendPoint[] => {
	const today = new Date();
	const expenseDates = allExpenses.map((expense) =>
		parseISODate(expense.date),
	);

	let start: Date;
	let end: Date;

	if (monthKey) {
		const monthRange = getMonthRange(monthKey);
		start = monthRange.start;
		end = monthRange.end;
	} else if (expenseDates.length > 0) {
		start = new Date(
			Math.min(...expenseDates.map((date) => date.getTime())),
		);
		end = new Date(
			Math.max(today.getTime(), ...expenseDates.map((date) => date.getTime())),
		);
	} else {
		start = today;
		end = today;
	}

	const startKey = formatISODate(start);
	const daily = generateDateRange(start, end).reduce(
		(acc, date) => {
			acc[date] = { credit: 0, debit: 0 };
			return acc;
		},
		{} as Record<string, { credit: number; debit: number }>,
	);

	let runningBalance = allExpenses
		.filter((expense) => expense.date < startKey)
		.reduce(
			(balance, expense) => balance + getExpenseNet(expense),
			initialBalance,
		);

	allExpenses.forEach((expense) => {
		if (!daily[expense.date]) return;

		if (expense.type === "Cr") {
			daily[expense.date].credit += expense.amount;
		} else {
			daily[expense.date].debit += expense.amount;
		}
	});

	return Object.entries(daily).map(([date, totals]) => {
		runningBalance += totals.credit - totals.debit;
		return {
			date,
			balance: runningBalance,
			credit: totals.credit,
			debit: totals.debit,
		};
	});
};

const drawBalanceTrendChart = (
	doc: jsPDF,
	points: BalanceTrendPoint[],
	x: number,
	y: number,
	width: number,
	height: number,
): void => {
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text("Balance Trend", x, y);

	const chartY = y + 7;
	const chartHeight = height - 13;
	const balances = points.map((point) => point.balance);
	const minBalance = Math.min(...balances, 0);
	const maxBalance = Math.max(...balances, 0);
	const range = Math.max(maxBalance - minBalance, 1);
	const paddedMin = minBalance - range * 0.1;
	const paddedMax = maxBalance + range * 0.1;
	const paddedRange = paddedMax - paddedMin || 1;

	doc.setDrawColor(210, 210, 210);
	doc.rect(x, chartY, width, chartHeight);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(7);
	doc.text(formatCurrency(paddedMax), x + 2, chartY + 4);
	doc.text(formatCurrency(paddedMin), x + 2, chartY + chartHeight - 2);

	if (points.length === 0) {
		doc.text("No balance data", x + width / 2, chartY + chartHeight / 2, {
			align: "center",
		});
		return;
	}

	const getX = (index: number) =>
		points.length === 1
			? x + width / 2
			: x + (index / (points.length - 1)) * width;
	const getY = (balance: number) =>
		chartY + chartHeight - ((balance - paddedMin) / paddedRange) * chartHeight;

	doc.setDrawColor(59, 130, 246);
	doc.setLineWidth(0.8);
	points.forEach((point, index) => {
		if (index === 0) return;
		const previous = points[index - 1];
		doc.line(
			getX(index - 1),
			getY(previous.balance),
			getX(index),
			getY(point.balance),
		);
	});

	const firstPoint = points[0];
	const lastPoint = points[points.length - 1];
	doc.setFontSize(7);
	doc.setTextColor(90, 90, 90);
	doc.text(firstPoint.date.slice(5), x, chartY + chartHeight + 4);
	doc.text(lastPoint.date.slice(5), x + width, chartY + chartHeight + 4, {
		align: "right",
	});
	doc.setTextColor(0, 0, 0);
};

const drawCategoryChart = (
	doc: jsPDF,
	expenses: ExpenseEntry[],
	x: number,
	y: number,
	width: number,
	height: number,
): void => {
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text("Expenses by Category", x, y);

	const grouped = expenses
		.filter((expense) => expense.type !== "Cr")
		.reduce((acc: Record<string, number>, expense) => {
			acc[expense.group] = (acc[expense.group] || 0) + expense.amount;
			return acc;
		}, {});

	const categoryData = Object.entries(grouped)
		.map(([group, amount]) => ({ group, amount }))
		.sort((a, b) => b.amount - a.amount)
		.slice(0, 8);

	const chartY = y + 8;
	const rowHeight = Math.max(5, (height - 12) / Math.max(categoryData.length, 1));
	const labelWidth = Math.min(48, width * 0.35);
	const barWidth = width - labelWidth - 36;
	const maxAmount = Math.max(...categoryData.map((item) => item.amount), 1);

	if (categoryData.length === 0) {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.text("No debit expenses", x + width / 2, chartY + height / 2, {
			align: "center",
		});
		return;
	}

	categoryData.forEach((item, index) => {
		const color = chartColors[index % chartColors.length];
		const barLength = (item.amount / maxAmount) * barWidth;
		const rowY = chartY + index * rowHeight;
		const label = item.group.length > 22 ? `${item.group.slice(0, 19)}...` : item.group;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(7);
		doc.text(label, x, rowY + 4);
		doc.setFillColor(color[0], color[1], color[2]);
		doc.rect(x + labelWidth, rowY, barLength, Math.max(rowHeight - 2, 2), "F");
		doc.setTextColor(70, 70, 70);
		doc.text(
			formatCurrency(item.amount),
			x + labelWidth + barLength + 2,
			rowY + 4,
		);
		doc.setTextColor(0, 0, 0);
	});
};

const groupExpensesByMonthAndDate = (
	expenses: ExpenseEntry[],
): Record<string, Record<string, ExpenseEntry[]>> => {
	return expenses.reduce(
		(acc, expense) => {
			const monthKey = expense.date.substring(0, 7);
			if (!acc[monthKey]) acc[monthKey] = {};
			if (!acc[monthKey][expense.date]) acc[monthKey][expense.date] = [];
			acc[monthKey][expense.date].push(expense);
			return acc;
		},
		{} as Record<string, Record<string, ExpenseEntry[]>>,
	);
};

const generateExpensesPDF = (
	expenses: ExpensesData,
	options: GenerateExpensesPDFOptions = {},
): jsPDF => {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const marginLeft = 14;
	const lineHeight = 7;
	const reportExpenses = expenses.expenses;
	const allExpenses = options.allExpenses || reportExpenses;
	const title = options.title || "Expense Report";
	const initialBalance = options.initialBalance ?? 0;

	let yPos = 20;

	const ensureSpace = (height: number) => {
		if (yPos + height > pageHeight - 16) {
			doc.addPage();
			yPos = 20;
		}
	};

	doc.setFontSize(18);
	doc.setFont("helvetica", "bold");
	doc.text(title, pageWidth / 2, yPos, { align: "center" });
	yPos += 8;

	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(
		`Generated: ${new Date().toLocaleDateString()}`,
		pageWidth / 2,
		yPos,
		{ align: "center" },
	);
	yPos += 12;

	const totalDebit = reportExpenses
		.filter((expense) => expense.type !== "Cr")
		.reduce((sum, expense) => sum + expense.amount, 0);
	const totalCredit = reportExpenses
		.filter((expense) => expense.type === "Cr")
		.reduce((sum, expense) => sum + expense.amount, 0);
	const netBalance = totalCredit - totalDebit;

	doc.setFillColor(245, 247, 250);
	doc.rect(marginLeft, yPos, pageWidth - marginLeft * 2, 25, "F");
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text("Summary", marginLeft + 4, yPos + 7);
	doc.setFont("helvetica", "normal");
	doc.text(`Credits: +${formatCurrency(totalCredit)}`, marginLeft + 4, yPos + 15);
	doc.text(`Debits: -${formatCurrency(totalDebit)}`, marginLeft + 65, yPos + 15);
	doc.text(`Net: ${formatCurrency(netBalance)}`, marginLeft + 125, yPos + 15);
	yPos += 35;

	ensureSpace(122);
	const balanceData = buildBalanceTrendData(
		allExpenses,
		initialBalance,
		options.monthKey,
	);
	drawBalanceTrendChart(
		doc,
		balanceData,
		marginLeft,
		yPos,
		pageWidth - marginLeft * 2,
		52,
	);
	yPos += 64;

	drawCategoryChart(
		doc,
		reportExpenses,
		marginLeft,
		yPos,
		pageWidth - marginLeft * 2,
		52,
	);
	yPos += 64;

	const expensesByMonth = groupExpensesByMonthAndDate(reportExpenses);
	const sortedMonths = Object.keys(expensesByMonth).sort((a, b) =>
		b.localeCompare(a),
	);

	if (sortedMonths.length === 0) {
		ensureSpace(12);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.text("No expense entries for this period.", marginLeft, yPos);
		return doc;
	}

	sortedMonths.forEach((monthKey) => {
		const monthDates = expensesByMonth[monthKey];

		ensureSpace(18);
		const monthLabel = getMonthLabel(monthKey);
		doc.setFontSize(14);
		doc.setFont("helvetica", "bold");
		doc.setFillColor(240, 240, 240);
		doc.rect(marginLeft - 2, yPos - 5, pageWidth - 24, 10, "F");
		doc.text(monthLabel, marginLeft, yPos);
		yPos += 10;

		const sortedDates = Object.keys(monthDates).sort((a, b) =>
			b.localeCompare(a),
		);

		let monthDebit = 0;
		let monthCredit = 0;

		sortedDates.forEach((date) => {
			const dayExpenses = monthDates[date];

			ensureSpace(24);
			doc.setFontSize(11);
			doc.setFont("helvetica", "bold");
			doc.text(
				parseISODate(date).toLocaleDateString("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
				}),
				marginLeft + 4,
				yPos,
			);
			yPos += 6;

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

			doc.setFont("helvetica", "normal");
			dayExpenses.forEach((expense) => {
				ensureSpace(10);
				const qty = expense.quantity
					? `${expense.quantity} ${expense.unit || ""}`
					: "-";
				const amount =
					expense.type === "Cr"
						? `+${formatCurrency(expense.amount)}`
						: `-${formatCurrency(expense.amount)}`;

				if (expense.type === "Cr") monthCredit += expense.amount;
				else monthDebit += expense.amount;

				doc.text(expense.name.substring(0, 25), marginLeft + 4, yPos);
				doc.text(expense.group.substring(0, 20), marginLeft + 54, yPos);
				doc.text(qty, marginLeft + 104, yPos);
				doc.text(amount, marginLeft + 134, yPos);
				doc.text(expense.type || "Dr", marginLeft + 164, yPos);
				yPos += lineHeight;
			});

			yPos += 4;
		});

		ensureSpace(30);
		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");
		doc.setFillColor(250, 250, 250);
		doc.rect(marginLeft, yPos, pageWidth - 28, 22, "FD");
		yPos += 6;
		doc.text(`${monthLabel} Summary`, marginLeft + 4, yPos);
		yPos += 6;
		doc.setFont("helvetica", "normal");
		doc.text(
			`Credits: +${formatCurrency(monthCredit)}   Debits: -${formatCurrency(monthDebit)}   Net: ${formatCurrency(monthCredit - monthDebit)}`,
			marginLeft + 4,
			yPos,
		);
		yPos += 14;
	});

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

const createScopedExpensesData = (
	source: ExpensesData,
	expenses: ExpenseEntry[],
	selectedDate: string,
): ExpensesData => {
	return {
		...source,
		expenses,
		selectedDate,
	};
};

const buildExpenseReportFiles = (
	financeData: FinanceState,
	expensesData: ExpensesData,
	reportScope: FinanceExportReportScope,
): ExpenseReportFile[] => {
	const allExpenses = expensesData.expenses || [];
	const initialBalance = financeData?.currentBalance ?? 0;

	if (reportScope === "lastTwoMonths") {
		return getLastTwoMonthKeys().map((monthKey) => {
			const monthExpenses = allExpenses.filter((expense) =>
				expense.date.startsWith(monthKey),
			);
			const scopedExpenses = createScopedExpensesData(
				expensesData,
				monthExpenses,
				`${monthKey}-01`,
			);

			return {
				fileName: `expenses-report-${monthKey}.pdf`,
				pdf: generateExpensesPDF(scopedExpenses, {
					title: `Expense Report - ${getMonthLabel(monthKey)}`,
					monthKey,
					initialBalance,
					allExpenses,
				}),
			};
		});
	}

	const reports: ExpenseReportFile[] = [
		{
			fileName: "expenses-report-all-months.pdf",
			pdf: generateExpensesPDF(expensesData, {
				title: "Expense Report - All Months",
				initialBalance,
				allExpenses,
			}),
		},
	];

	getExpenseMonthKeys(allExpenses).forEach((monthKey) => {
		const monthExpenses = allExpenses.filter((expense) =>
			expense.date.startsWith(monthKey),
		);
		const scopedExpenses = createScopedExpensesData(
			expensesData,
			monthExpenses,
			`${monthKey}-01`,
		);

		reports.push({
			fileName: `expenses-report-${monthKey}.pdf`,
			pdf: generateExpensesPDF(scopedExpenses, {
				title: `Expense Report - ${getMonthLabel(monthKey)}`,
				monthKey,
				initialBalance,
				allExpenses,
			}),
		});
	});

	return reports;
};

export const handleFinanceExport = async (
	financeData: FinanceState,
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

		// Finance data
		if (financeData) {
			zip.file("finance-data.json", JSON.stringify(financeData, null, 2));
		}

		// Expenses data
		if (expensesData?.expenses) {
			zip.file(
				"expenses-data.json",
				JSON.stringify(expensesData, null, 2),
			);

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

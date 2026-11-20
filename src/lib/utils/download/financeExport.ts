import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveFile, savedTo } from "@src/lib/utils/saveFile";
import { ExpensesData, ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";

import { ExpenseEntry, FinanceState, SimulatedExpense } from "@src/features/finance/type";

import { buildFinanceBackup, FINANCE_BACKUP_FILE } from "@src/features/finance/lib/financeBackup";
import { buildExpenseReport, getMonthLabel } from "@src/features/finance/lib/expenseReport";
import { renderExpenseReportPdf } from "@src/features/finance/lib/expenseReportPdf";
import { formatISODate } from "@src/lib/utils/isoDate";






import { monthsOfPeriod, periodFileName, periodLabel, type ReportPeriod } from "@src/features/finance/lib/reportPeriods";
import { formatTimestamp, createMetadata } from "@src/lib/utils/download/shared";

export type FinanceExportReportScope = "allMonths" | "lastTwoMonths" | ReportPeriod;

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

	if (typeof reportScope === "object") {
		return [
			{
				fileName: periodFileName(reportScope),
				pdf: renderExpenseReportPdf(
					buildExpenseReport({
						financeData,
						allExpenses,
						...(reportScope.kind === "month"
							? { monthKey: reportScope.month }
							: { periodMonths: monthsOfPeriod(reportScope) }),
						title: `Expense Report - ${periodLabel(reportScope, getMonthLabel)}`,
					}),
				),
			},
		];
	}

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

	if (typeof reportScope === "object") {
		const months = monthsOfPeriod(reportScope);
		const any = (expensesData?.expenses ?? []).some((e) => months.includes(e.date.slice(0, 7)));
		if (!any) {
			showNotification?.(`No expenses in ${periodLabel(reportScope, getMonthLabel)}`, "info");
			return;
		}
	}

	try {
		// Desktop: the PDFs go straight into the Finance folder (the folder itself is the backup).
		if (window.desktop) {
			const files: { name: string; pdf: jsPDF }[] = [];
			if (expensesData?.expenses) {
				buildExpenseReportFiles(financeData, expensesData, reportScope).forEach((report) =>
					files.push({ name: report.fileName, pdf: report.pdf }),
				);
			}
			if (simulatedData?.length) {
				files.push({
					name: "estimated-prices.pdf",
					pdf: generateEstimatedPDF({
						simulatedExpenses: simulatedData,
						totalEstimatedPrice: totalSimulatedCost,
					}),
				});
			}
			if (files.length === 0) {
				showNotification?.("No finance data to export", "error");
				return;
			}
			for (const file of files) {
				await saveFile(file.pdf.output("blob"), file.name, "Finance", true);
			}
			showNotification?.(
				`${files.length} PDF${files.length === 1 ? "" : "s"} saved in the Finance folder`,
				"success",
			);
			return;
		}

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
		const saved = await saveFile(blob, `expense-export_${formatTimestamp()}.zip`);
		if (saved.cancelled) return;
		showNotification?.(`Expense data exported successfully${savedTo(saved.path)}`, "success");
	} catch (error) {
		console.error("Finance export error:", error);
		showNotification?.("Failed to export finance data", "error");
	}
};

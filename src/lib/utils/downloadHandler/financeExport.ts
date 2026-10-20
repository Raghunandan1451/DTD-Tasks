import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { ExpensesData, ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";
import type { FinanceState, SimulatedExpense } from "@src/features/finance/type";
import { createMetadata, formatTimestamp } from "./common";
import { buildExpenseReportFiles, generateEstimatedPDF, type FinanceExportReportScope } from "./expenseReports";

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

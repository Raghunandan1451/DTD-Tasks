import jsPDF from "jspdf";
import { ExpenseReport } from "@src/features/finance/lib/expenseReport";
import { MARGIN, createLayout, drawSectionHeading, drawTitle } from "@src/features/finance/lib/pdf/pdfLayout";
import { drawExpenseMonth, drawExpenseSummary } from "@src/features/finance/lib/pdf/expenseSummaryPdf";
import { drawTrendMonth, drawTrendTotals } from "@src/features/finance/lib/pdf/trendPdf";
import { drawBalanceTrendChart, drawCategoryChart } from "@src/features/finance/lib/pdf/chartsPdf";

/**
 * Report template: 1) Expenses, 2) Balance Trend with the needs / wants /
 * savings split per month, 3) Graphs last.
 */
export const renderExpenseReportPdf = (report: ExpenseReport): jsPDF => {
	const doc = new jsPDF();
	const layout = createLayout(doc);

	drawTitle(layout, report.title);

	drawSectionHeading(layout, "1. Expenses");
	drawExpenseSummary(layout, report);
	if (report.months.length === 0) {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.text("No expense entries for this period.", MARGIN, layout.y);
		layout.y += 12;
	}
	report.months.forEach((month) => drawExpenseMonth(layout, month));

	if (report.months.length > 0) {
		drawSectionHeading(layout, "2. Balance Trend", 85);
		report.months.forEach((month) => drawTrendMonth(layout, month));
		if (report.months.length > 1) drawTrendTotals(layout, report);
	}

	drawSectionHeading(layout, "3. Graphs", 125);
	drawBalanceTrendChart(
		doc,
		report.balanceSeries,
		MARGIN,
		layout.y,
		layout.contentWidth,
		52,
	);
	layout.y += 64;
	drawCategoryChart(
		doc,
		report.categoryTotals,
		MARGIN,
		layout.y,
		layout.contentWidth,
		52,
	);
	layout.y += 64;

	return doc;
};

import { ExpenseReport, getMonthLabel, ReportMonth } from "@src/features/finance/lib/expenseReport";
import { BLACK, GREEN, Layout, MARGIN, RED, clip, formatMoney, setColor } from "@src/features/finance/lib/pdf/pdfLayout";
import { COL_ALLOCATED, COL_LEFT, COL_SPENT, drawMoneyCell } from "@src/features/finance/lib/pdf/moneyCells";

export const drawTrendMonth = (layout: Layout, month: ReportMonth): void => {
	const { doc } = layout;
	const { trend } = month;
	const rowCount = trend.categories.length + 2 + (trend.unassignedSpend > 0 ? 1 : 0);
	layout.ensureSpace(34 + rowCount * 6);

	doc.setFont("helvetica", "bold");
	doc.setFontSize(11);
	doc.text(getMonthLabel(month.monthKey), MARGIN + 2, layout.y);
	layout.y += 6;

	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.text(
		`Opening ${formatMoney(trend.openingBalance)}   Credits +${formatMoney(trend.credits)}   Debits -${formatMoney(trend.debits)}   Closing ${formatMoney(trend.closingBalance)}`,
		MARGIN + 2,
		layout.y,
	);
	layout.y += 6;
	doc.text(
		`Budget income: ${formatMoney(trend.income.amount)}${trend.income.isEstimated ? " (estimated from current salary)" : ""}`,
		MARGIN + 2,
		layout.y,
	);
	layout.y += 6;

	doc.setFont("helvetica", "bold");
	doc.text("Category", MARGIN + 2, layout.y);
	doc.text("Allocated", COL_ALLOCATED, layout.y, { align: "right" });
	doc.text("Spent", COL_SPENT, layout.y, { align: "right" });
	doc.text("Left", COL_LEFT, layout.y, { align: "right" });
	layout.y += 2;
	doc.line(MARGIN + 2, layout.y, COL_LEFT, layout.y);
	layout.y += 4;

	doc.setFont("helvetica", "normal");
	trend.categories.forEach((row) => {
		doc.text(
			clip(`${row.name || "Unnamed"} (${row.percentage}%)`, 38),
			MARGIN + 2,
			layout.y,
		);
		drawMoneyCell(doc, row.allocation, COL_ALLOCATED, layout.y);
		drawMoneyCell(doc, row.spent, COL_SPENT, layout.y);
		drawMoneyCell(doc, row.left, COL_LEFT, layout.y, { negativeIsBad: true });
		layout.y += 5.5;
	});

	doc.text(`Savings (${trend.savingsPercentage}%)`, MARGIN + 2, layout.y);
	drawMoneyCell(doc, trend.savingsAllocation, COL_ALLOCATED, layout.y);
	doc.text("-", COL_SPENT, layout.y, { align: "right" });
	drawMoneyCell(doc, trend.savingsAllocation, COL_LEFT, layout.y);
	layout.y += 5.5;

	if (trend.unassignedSpend > 0) {
		setColor(doc, RED);
		doc.text("Unassigned spend (not in budget)", MARGIN + 2, layout.y);
		doc.text(formatMoney(trend.unassignedSpend), COL_SPENT, layout.y, {
			align: "right",
		});
		setColor(doc, BLACK);
		layout.y += 5.5;
	}

	doc.line(MARGIN + 2, layout.y - 2, COL_LEFT, layout.y - 2);
	layout.y += 2;
	doc.setFont("helvetica", "bold");
	doc.text("Potential savings", MARGIN + 2, layout.y);
	setColor(doc, trend.potentialSavings < 0 ? RED : GREEN);
	doc.text(formatMoney(trend.potentialSavings), COL_LEFT, layout.y, {
		align: "right",
	});
	setColor(doc, BLACK);
	layout.y += 12;
};

export const drawTrendTotals = (layout: Layout, report: ExpenseReport): void => {
	const { doc } = layout;
	const { income, credits, debits, potentialSavings } = report.trendTotals;

	layout.ensureSpace(28);
	doc.setFillColor(245, 247, 250);
	doc.rect(MARGIN, layout.y, layout.contentWidth, 20, "F");
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text(`Total across ${report.months.length} months`, MARGIN + 4, layout.y + 7);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);
	doc.text(
		`Budget income ${formatMoney(income)}   Credits +${formatMoney(credits)}   Debits -${formatMoney(debits)}   Potential savings ${formatMoney(potentialSavings)}`,
		MARGIN + 4,
		layout.y + 14,
	);
	layout.y += 28;
};

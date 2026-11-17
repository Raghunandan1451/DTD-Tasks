import { ExpenseReport, getMonthLabel, ReportMonth } from "@src/features/finance/lib/expenseReport";
import { parseISODate } from "@src/lib/utils/isoDate";
import { LINE, Layout, MARGIN, clip, formatMoney } from "@src/features/finance/lib/pdf/pdfLayout";

// --- Section 1: Expenses -------------------------------------------------

export const drawExpenseSummary = (layout: Layout, report: ExpenseReport): void => {
	const { doc } = layout;
	const { credits, debits, net } = report.totals;

	doc.setFillColor(245, 247, 250);
	doc.rect(MARGIN, layout.y, layout.contentWidth, 25, "F");
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text("Summary", MARGIN + 4, layout.y + 7);
	doc.setFont("helvetica", "normal");
	doc.text(`Credits: +${formatMoney(credits)}`, MARGIN + 4, layout.y + 15);
	doc.text(`Debits: -${formatMoney(debits)}`, MARGIN + 65, layout.y + 15);
	doc.text(`Net: ${formatMoney(net)}`, MARGIN + 125, layout.y + 15);
	layout.y += 35;
};

export const drawExpenseMonth = (layout: Layout, month: ReportMonth): void => {
	const { doc, pageWidth } = layout;
	const monthLabel = getMonthLabel(month.monthKey);

	layout.ensureSpace(18);
	doc.setFontSize(14);
	doc.setFont("helvetica", "bold");
	doc.setFillColor(240, 240, 240);
	doc.rect(MARGIN - 2, layout.y - 5, pageWidth - 24, 10, "F");
	doc.text(monthLabel, MARGIN, layout.y);
	layout.y += 10;

	if (month.days.length === 0) {
		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		doc.text("No expense entries for this period.", MARGIN + 4, layout.y);
		layout.y += 12;
		return;
	}

	month.days.forEach((day) => {
		layout.ensureSpace(24);
		doc.setFontSize(11);
		doc.setFont("helvetica", "bold");
		doc.text(
			parseISODate(day.date).toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			}),
			MARGIN + 4,
			layout.y,
		);
		layout.y += 6;

		doc.setFontSize(9);
		doc.text("Name", MARGIN + 4, layout.y);
		doc.text("Group", MARGIN + 54, layout.y);
		doc.text("Qty", MARGIN + 104, layout.y);
		doc.text("Amount", MARGIN + 134, layout.y);
		doc.text("Type", MARGIN + 164, layout.y);
		layout.y += 3;
		doc.line(MARGIN + 4, layout.y, pageWidth - MARGIN, layout.y);
		layout.y += 3;

		doc.setFont("helvetica", "normal");
		day.entries.forEach((entry) => {
			layout.ensureSpace(10);
			const isCredit = entry.type === "Cr";
			const qty = entry.quantity ? `${entry.quantity} ${entry.unit || ""}` : "-";

			doc.text(clip(entry.name, 25), MARGIN + 4, layout.y);
			doc.text(clip(entry.group, 20), MARGIN + 54, layout.y);
			doc.text(qty, MARGIN + 104, layout.y);
			doc.text(
				`${isCredit ? "+" : "-"}${formatMoney(entry.amount)}`,
				MARGIN + 134,
				layout.y,
			);
			doc.text(entry.type || "Dr", MARGIN + 164, layout.y);
			layout.y += LINE;
		});

		layout.y += 4;
	});

	const { credits, debits } = month.trend;
	layout.ensureSpace(30);
	doc.setFontSize(9);
	doc.setFont("helvetica", "bold");
	doc.setFillColor(250, 250, 250);
	doc.rect(MARGIN, layout.y, pageWidth - 28, 22, "FD");
	layout.y += 6;
	doc.text(`${monthLabel} Summary`, MARGIN + 4, layout.y);
	layout.y += 6;
	doc.setFont("helvetica", "normal");
	doc.text(
		`Credits: +${formatMoney(credits)}   Debits: -${formatMoney(debits)}   Net: ${formatMoney(credits - debits)}`,
		MARGIN + 4,
		layout.y,
	);
	// The summary box is 22 tall; leave room so the next band doesn't overlap it
	layout.y += 20;
};

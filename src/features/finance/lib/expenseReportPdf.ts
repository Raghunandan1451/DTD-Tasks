import jsPDF from "jspdf";
import {
	ExpenseReport,
	getMonthLabel,
	ReportMonth,
} from "@src/features/finance/lib/expenseReport";
import type { BalanceTrendPoint } from "@src/features/finance/lib/balanceTrend";
import type { CategoryAmount } from "@src/features/finance/lib/categoryGrouping";
import { parseISODate } from "@src/lib/utils/isoDate";

// Built-in helvetica only renders ASCII, so keep every string in the PDF ASCII.

const MARGIN = 14;
const LINE = 7;
const BOTTOM_MARGIN = 16;

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

const RED: [number, number, number] = [200, 40, 40];
const GREEN: [number, number, number] = [22, 140, 90];
const BLACK: [number, number, number] = [0, 0, 0];

const formatMoney = (value: number): string =>
	value.toLocaleString("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	});

const signed = (value: number): string =>
	`${value < 0 ? "-" : "+"}${formatMoney(Math.abs(value))}`;

const clip = (text: string, max: number): string =>
	text.length > max ? `${text.slice(0, max - 3)}...` : text;

interface Layout {
	doc: jsPDF;
	pageWidth: number;
	contentWidth: number;
	/** Current vertical position; mutated as content is drawn */
	y: number;
	ensureSpace: (height: number) => void;
}

const createLayout = (doc: jsPDF): Layout => {
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const layout: Layout = {
		doc,
		pageWidth,
		contentWidth: pageWidth - MARGIN * 2,
		y: 20,
		ensureSpace: (height) => {
			if (layout.y + height > pageHeight - BOTTOM_MARGIN) {
				doc.addPage();
				layout.y = 20;
			}
		},
	};
	return layout;
};

const setColor = (doc: jsPDF, color: [number, number, number]) =>
	doc.setTextColor(color[0], color[1], color[2]);

/** `minContent` keeps the heading with the content below it instead of stranding it at a page bottom */
const drawSectionHeading = (
	layout: Layout,
	text: string,
	minContent = 40,
): void => {
	const { doc } = layout;
	layout.y += 6;
	layout.ensureSpace(14 + minContent);
	doc.setFillColor(30, 41, 59);
	doc.rect(MARGIN - 2, layout.y - 6, layout.contentWidth + 4, 10, "F");
	doc.setFont("helvetica", "bold");
	doc.setFontSize(13);
	doc.setTextColor(255, 255, 255);
	doc.text(text, MARGIN + 1, layout.y + 1);
	setColor(doc, BLACK);
	layout.y += 12;
};

const drawTitle = (layout: Layout, title: string): void => {
	const { doc, pageWidth } = layout;
	doc.setFontSize(18);
	doc.setFont("helvetica", "bold");
	doc.text(title, pageWidth / 2, layout.y, { align: "center" });
	layout.y += 8;

	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, layout.y, {
		align: "center",
	});
	layout.y += 12;
};

// --- Section 1: Expenses -------------------------------------------------

const drawExpenseSummary = (layout: Layout, report: ExpenseReport): void => {
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

const drawExpenseMonth = (layout: Layout, month: ReportMonth): void => {
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

// --- Section 2: Balance trend (needs / wants / savings) ------------------

// Right edges of the money columns in the category table
const COL_ALLOCATED = 110;
const COL_SPENT = 145;
const COL_LEFT = 180;

const drawMoneyCell = (
	doc: jsPDF,
	value: number,
	rightEdge: number,
	y: number,
	options: { sign?: boolean; negativeIsBad?: boolean } = {},
): void => {
	const text = options.sign ? signed(value) : formatMoney(value);
	if (options.negativeIsBad && value < 0) setColor(doc, RED);
	doc.text(text, rightEdge, y, { align: "right" });
	setColor(doc, BLACK);
};

const drawTrendMonth = (layout: Layout, month: ReportMonth): void => {
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

const drawTrendTotals = (layout: Layout, report: ExpenseReport): void => {
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

// --- Section 3: Graphs ---------------------------------------------------

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
	const paddedMin = minBalance - range * 0.18;
	const paddedMax = maxBalance + range * 0.18;
	const paddedRange = paddedMax - paddedMin || 1;

	doc.setDrawColor(210, 210, 210);
	doc.rect(x, chartY, width, chartHeight);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(7);
	doc.text(formatMoney(paddedMax), x + 2, chartY + 4);
	doc.text(formatMoney(paddedMin), x + 2, chartY + chartHeight - 2);

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
		doc.line(
			getX(index - 1),
			getY(points[index - 1].balance),
			getX(index),
			getY(point.balance),
		);
	});
	doc.setLineWidth(0.2);

	doc.setFontSize(7);
	doc.setTextColor(90, 90, 90);
	doc.text(points[0].date.slice(5), x, chartY + chartHeight + 4);
	doc.text(points[points.length - 1].date.slice(5), x + width, chartY + chartHeight + 4, {
		align: "right",
	});
	setColor(doc, BLACK);
};

const drawCategoryChart = (
	doc: jsPDF,
	categories: CategoryAmount[],
	x: number,
	y: number,
	width: number,
	height: number,
): void => {
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.text("Expenses by Category", x, y);

	const chartY = y + 8;
	if (categories.length === 0) {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.text("No debit expenses", x + width / 2, chartY + height / 2, {
			align: "center",
		});
		return;
	}

	const rowHeight = Math.max(5, (height - 12) / categories.length);
	const labelWidth = Math.min(48, width * 0.35);
	const barWidth = width - labelWidth - 36;
	const maxAmount = Math.max(...categories.map((item) => item.amount), 1);

	categories.forEach((item, index) => {
		const color = chartColors[index % chartColors.length];
		const barLength = (item.amount / maxAmount) * barWidth;
		const rowY = chartY + index * rowHeight;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(7);
		doc.text(clip(item.group, 22), x, rowY + 4);
		doc.setFillColor(color[0], color[1], color[2]);
		doc.rect(x + labelWidth, rowY, barLength, Math.max(rowHeight - 2, 2), "F");
		doc.setTextColor(70, 70, 70);
		doc.text(formatMoney(item.amount), x + labelWidth + barLength + 2, rowY + 4);
		setColor(doc, BLACK);
	});
};

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

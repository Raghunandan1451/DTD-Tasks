import jsPDF from "jspdf";
import type { BalanceTrendPoint } from "@src/features/finance/lib/balanceTrend";
import type { CategoryAmount } from "@src/features/finance/lib/categoryGrouping";
import { BLACK, chartColors, clip, formatMoney, setColor } from "@src/features/finance/lib/pdf/pdfLayout";

// --- Section 3: Graphs ---------------------------------------------------

export const drawBalanceTrendChart = (
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

export const drawCategoryChart = (
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

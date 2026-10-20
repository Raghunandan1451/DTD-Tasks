import jsPDF from "jspdf";
import type {
	ExpenseEntry,
} from "@src/features/finance/type";

interface ExpensesData {
	expenses: ExpenseEntry[];
	selectedDate: string;
	loaded: boolean;
}

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

const getExpenseNet = (expense: ExpenseEntry): number =>
	expense.type === "Cr" ? expense.amount : -expense.amount;

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

export const generateMonthlyExpenseReportPDF = (
	currentBalance: number,
	expenses: ExpenseEntry[],
	monthKey: string,
): Blob => {
	const monthExpenses = expenses.filter(
		(expense) => expense.date.substring(0, 7) === monthKey,
	);
	const report = generateExpensesPDF(
		{
			expenses: monthExpenses,
			selectedDate: `${monthKey}-01`,
			loaded: true,
		},
		{
			title: `Expense Report - ${getMonthLabel(monthKey)}`,
			monthKey,
			initialBalance: currentBalance,
			allExpenses: expenses,
		},
	);
	return report.output("blob");
};

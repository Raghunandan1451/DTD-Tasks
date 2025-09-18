import React, { useMemo } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Expense } from "@src/features/finance/type";

interface BalanceTrendChartProps {
	expenses: Expense[];
	initialBalance: number;
}

const BalanceTrendChart: React.FC<BalanceTrendChartProps> = ({
	expenses,
	initialBalance,
}) => {
	const formatCurrency = (val: number) => val.toLocaleString();
	const formatDate = (dateStr: string) =>
		new Date(dateStr).toLocaleDateString();

	const getLineColor = (balance: number) => {
		if (balance > initialBalance) return "#22c55e"; // green
		if (balance < initialBalance) return "#ef4444"; // red
		return "#3b82f6"; // blue
	};

	// Generate date range utility
	const generateDateRange = (start: Date, end: Date): string[] => {
		const dates: string[] = [];
		const cur = new Date(start);
		while (cur <= end) {
			dates.push(cur.toISOString().split("T")[0]);
			cur.setDate(cur.getDate() + 1);
		}
		return dates;
	};

	// Build balance data
	const balanceData = useMemo(() => {
		if (!expenses.length) return [];

		const dates = expenses.map((e) => new Date(e.date));
		const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
		const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
		const dateRange = generateDateRange(minDate, maxDate);

		const daily: Record<string, { credit: number; debit: number }> = {};
		dateRange.forEach((d) => {
			daily[d] = { credit: 0, debit: 0 };
		});
		expenses.forEach((e) => {
			if (daily[e.date]) {
				if (e.type === "Cr") daily[e.date].credit += e.amount;
				else daily[e.date].debit += e.amount;
			}
		});

		let running = initialBalance;
		return dateRange.map((d) => {
			const { credit, debit } = daily[d];
			const net = credit - debit;
			running += net;
			return { date: d, balance: running, credit, debit, netChange: net };
		});
	}, [expenses, initialBalance]);

	const currentBalance = balanceData.at(-1)?.balance ?? initialBalance;
	const maxBalance = Math.max(
		...balanceData.map((d) => d.balance),
		initialBalance
	);
	const yMax = maxBalance * 1.5;

	return (
		<div className="rounded-2xl p-6 backdrop-blur-xl border shadow-lg bg-white/20 dark:bg-black/20">
			<div className="flex justify-between items-center mb-4 flex-wrap gap-3">
				<h4 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
					<TrendingUp className="w-5 h-5" />
					Balance Trend (Start: {formatCurrency(initialBalance)})
				</h4>
			</div>

			<ResponsiveContainer width="100%" height={430}>
				<LineChart data={balanceData}>
					<XAxis dataKey="date" tickFormatter={formatDate} />
					<YAxis tickFormatter={formatCurrency} domain={[0, yMax]} />
					<Tooltip
						formatter={(v: number, name: string) => [
							formatCurrency(v),
							name,
						]}
						labelFormatter={formatDate}
						contentStyle={{
							backgroundColor: "var(--tooltip-bg)",
							borderRadius: "8px",
							border: "none",
							color: "var(--tooltip-text)",
						}}
						itemStyle={{ color: "var(--tooltip-text)" }}
						labelStyle={{ color: "var(--tooltip-label)" }}
					/>

					<ReferenceLine
						y={initialBalance}
						stroke="rgb(107 114 128 / 0.5)"
					/>
					<Line
						type="monotone"
						dataKey="balance"
						stroke={getLineColor(currentBalance)}
						strokeWidth={1}
						dot={{ r: 1, strokeWidth: 0 }}
						activeDot={{
							r: 4,
							fill: getLineColor(currentBalance),
							stroke: "currentColor",
							strokeWidth: 1,
						}}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};

export default BalanceTrendChart;

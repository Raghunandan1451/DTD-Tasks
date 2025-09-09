import { Expense } from "@src/lib/types/graphs";
import React, { useMemo } from "react";
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	Legend,
} from "recharts";

const chartColors = [
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#84cc16",
];

const ExpensesByCategoryPie: React.FC<{ expenses: Expense[] }> = ({
	expenses,
}) => {
	const formatCurrency = (val: number) => val.toLocaleString();

	const data = useMemo(() => {
		const grouped = expenses
			.filter((e) => e.type === "Dr")
			.reduce((acc: Record<string, number>, e) => {
				acc[e.group] = (acc[e.group] || 0) + e.amount;
				return acc;
			}, {});
		return Object.entries(grouped).map(([group, amount]) => ({
			name: group,
			value: amount,
		}));
	}, [expenses]);

	return (
		<div className="rounded-2xl p-6 backdrop-blur-xl border shadow-lg bg-white/20 dark:bg-black/20">
			<h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
				Total Expenses by Category
			</h4>
			<ResponsiveContainer width="100%" height={380}>
				<PieChart>
					<Pie
						data={data}
						cx="50%"
						cy="50%"
						labelLine={false}
						label={({ percent = 0 }) =>
							`${(percent * 100).toFixed(0)}%`
						}
						outerRadius={110}
						dataKey="value"
					>
						{data.map((_, i) => (
							<Cell
								key={i}
								fill={chartColors[i % chartColors.length]}
							/>
						))}
					</Pie>

					<Tooltip
						formatter={(v: number) => formatCurrency(v)}
						contentStyle={{
							backgroundColor: "var(--tooltip-bg)",
							borderRadius: "8px",
							border: "none",
							color: "var(--tooltip-text)",
						}}
						itemStyle={{ color: "var(--tooltip-text)" }}
						labelStyle={{ color: "var(--tooltip-label)" }}
					/>

					<Legend />
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
};

export default ExpensesByCategoryPie;

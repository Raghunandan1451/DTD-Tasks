import React, { useMemo, useState } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import { Calendar } from "lucide-react";
import { DateFilter, Expense } from "@src/features/finance/type";
import Button from "@src/components/ui/button/Button";

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

const ExpensesByCategoryBar: React.FC<{ expenses: Expense[] }> = ({
	expenses,
}) => {
	const [filter, setFilter] = useState<DateFilter>("weekly");

	const formatCurrency = (val: number) => val.toLocaleString();

	const data = useMemo(() => {
		const now = new Date();
		const filtered = expenses.filter((e) => {
			const d = new Date(e.date);
			switch (filter) {
				case "today": {
					return d.toDateString() === now.toDateString();
				}
				case "yesterday": {
					const y = new Date(now);
					y.setDate(now.getDate() - 1);
					return d.toDateString() === y.toDateString();
				}
				case "weekly": {
					const weekAgo = new Date(now);
					weekAgo.setDate(now.getDate() - 7);
					return d >= weekAgo;
				}
				case "monthly": {
					const monthAgo = new Date(now);
					monthAgo.setMonth(now.getMonth() - 1);
					return d >= monthAgo;
				}
				case "yearly": {
					const yearAgo = new Date(now);
					yearAgo.setFullYear(now.getFullYear() - 1);
					return d >= yearAgo;
				}
				default:
					return true;
			}
		});

		const grouped = filtered
			.filter((e) => e.type === "Dr")
			.reduce((acc: Record<string, number>, e) => {
				acc[e.group] = (acc[e.group] || 0) + e.amount;
				return acc;
			}, {});
		return Object.entries(grouped).map(([group, amount]) => ({
			group,
			amount,
		}));
	}, [expenses, filter]);

	return (
		<div className="rounded-2xl p-6 backdrop-blur-xl border shadow-lg bg-white/20 dark:bg-black/20">
			<div className="flex justify-between items-center mb-4 flex-wrap gap-3">
				<h4 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
					<Calendar className="w-5 h-5" />
					Expenses by Category
				</h4>
				<div className="flex gap-2 overflow-x-auto scrollbar-hide">
					{(
						[
							"today",
							"yesterday",
							"weekly",
							"monthly",
							"yearly",
						] as DateFilter[]
					).map((opt) => (
						<Button
							key={opt}
							onClick={() => setFilter(opt)}
							className={`px-3 py-1 rounded-md text-sm whitespace-nowrap ${
								filter === opt
									? "bg-blue-500 text-white"
									: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
							}`}
						>
							{opt}
						</Button>
					))}
				</div>
			</div>

			<ResponsiveContainer width="100%" height={380}>
				<BarChart data={data}>
					<XAxis dataKey="group" />
					<YAxis tickFormatter={formatCurrency} />
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
						cursor={{ fill: "var(--cursor-fill)" }}
					/>

					<Bar dataKey="amount" radius={[4, 4, 0, 0]}>
						{data.map((_, i) => (
							<Cell
								key={i}
								fill={chartColors[i % chartColors.length]}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

export default ExpensesByCategoryBar;

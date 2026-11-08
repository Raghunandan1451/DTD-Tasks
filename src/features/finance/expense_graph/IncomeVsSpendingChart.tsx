import React from "react";
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { MonthFlow } from "@src/features/finance/lib/monthlyFlow";

interface IncomeVsSpendingChartProps {
	data: MonthFlow[];
	height?: number;
	headerExtra?: React.ReactNode;
}

const formatCurrency = (val: number) => val.toLocaleString();

/** Income and spending per month, with what was left over as a line. */
const IncomeVsSpendingChart: React.FC<IncomeVsSpendingChartProps> = ({
	data,
	height = 360,
	headerExtra,
}) => (
	<div className="rounded-lg border bg-white/20 p-3 shadow-lg backdrop-blur-xl dark:bg-black/20">
		<div className="mb-2 flex flex-wrap items-center justify-between gap-3">
			<h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
				<BarChart3 className="h-4 w-4" />
				Income vs spending
			</h4>
			{headerExtra}
		</div>
		<ResponsiveContainer width="100%" height={height}>
			<ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
				<CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
				<XAxis dataKey="label" />
				<YAxis tickFormatter={formatCurrency} width={64} />
				<Tooltip
					formatter={(value, name) => [
						formatCurrency(typeof value === "number" ? value : Number(value) || 0),
						String(name),
					]}
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
				<Legend />
				<Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
				<Bar dataKey="spent" name="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
				<Line
					type="monotone"
					dataKey="saved"
					name="Saved"
					stroke="#3b82f6"
					strokeWidth={2}
					dot={{ r: 3 }}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	</div>
);

export default IncomeVsSpendingChart;

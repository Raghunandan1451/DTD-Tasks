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
import { useBalanceTrendData } from "@src/features/finance/hooks/useBalanceTrendData";
import { createChangeOnlyDot } from "@src/features/finance/expense_graph/ChangeOnlyDot";
import BalanceTrendTooltip from "@src/features/finance/expense_graph/BalanceTrendTooltip";
import BalanceTrendRangeFilter from "@src/features/finance/expense_graph/BalanceTrendRangeFilter";
import ThemedBrush from "@src/features/finance/expense_graph/ThemedBrush";

interface BalanceTrendChartProps {
	expenses: Expense[];
	initialBalance: number;
}

const VISIBLE_DAY_COUNT = 30;

const formatCurrency = (val: number) => val.toLocaleString();
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

const BalanceTrendChart: React.FC<BalanceTrendChartProps> = ({
	expenses,
	initialBalance,
}) => {
	const {
		balanceData,
		range,
		setRange,
		lineColor,
		yDomain,
		dateAxisTicks,
		significantDates,
	} = useBalanceTrendData(expenses, initialBalance, VISIBLE_DAY_COUNT);

	const renderDot = useMemo(
		() => createChangeOnlyDot(significantDates, lineColor),
		[significantDates, lineColor],
	);

	return (
		<div className="rounded-lg p-6 backdrop-blur-xl border shadow-lg bg-white/20 dark:bg-black/20">
			<div className="flex justify-between items-center mb-4 flex-wrap gap-3">
				<h4 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
					<TrendingUp className="w-5 h-5" />
					Balance Trend (Start: {formatCurrency(initialBalance)})
				</h4>
				<BalanceTrendRangeFilter
					balanceData={balanceData}
					range={range}
					onRangeChange={setRange}
				/>
			</div>

			<ResponsiveContainer width="100%" height={430}>
				<LineChart data={balanceData}>
					<XAxis
						dataKey="date"
						tickFormatter={formatDate}
						ticks={dateAxisTicks}
						minTickGap={24}
					/>
					<YAxis
						width={78}
						tickFormatter={formatCurrency}
						domain={yDomain}
					/>
					<Tooltip content={<BalanceTrendTooltip />} />
					<ReferenceLine
						y={initialBalance}
						stroke="rgb(107 114 128 / 0.5)"
					/>
					<Line
						type="monotone"
						dataKey="balance"
						stroke={lineColor}
						strokeWidth={1}
						dot={renderDot}
						activeDot={{
							r: 4,
							fill: lineColor,
							stroke: "currentColor",
							strokeWidth: 1,
						}}
					/>
					<ThemedBrush range={range} onRangeChange={setRange} />
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};

export default BalanceTrendChart;

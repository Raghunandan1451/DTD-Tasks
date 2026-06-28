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
import {
	groupExpensesByCategory,
	withPercentages,
} from "@src/features/finance/lib/categoryGrouping";
import { getCategoryColor } from "@src/features/finance/lib/chartConstants";
import { filterExpensesByDateRange } from "@src/features/finance/lib/dateFilters";
import CategoryColumnTick from "@src/features/finance/expense_graph/CategoryColumnTick";
import PercentageBarLabel from "@src/features/finance/expense_graph/PercentageBarLabel";
import DateFilterPills from "@src/features/finance/expense_graph/DateFilterPills";

const formatCurrency = (val: number) => val.toLocaleString();
const MIN_COLUMN_WIDTH = 90;

const ExpensesByCategoryBar: React.FC<{ expenses: Expense[] }> = ({
	expenses,
}) => {
	const [filter, setFilter] = useState<DateFilter>("weekly");

	const data = useMemo(() => {
		const filtered = filterExpensesByDateRange(expenses, filter);
		return withPercentages(groupExpensesByCategory(filtered));
	}, [expenses, filter]);

	// Each category needs a minimum column width to stay readable --
	// rather than squeeze N columns into a fixed container, the chart
	// grows wider and scrolls horizontally once there are more
	// categories than comfortably fit.
	const chartWidth = Math.max(data.length * MIN_COLUMN_WIDTH, 320);
	const maxLabelLength = data.length > 6 ? 8 : 14;

	return (
		<div className="rounded-lg p-6 backdrop-blur-xl border shadow-lg bg-white/20 dark:bg-black/20">
			<div className="flex justify-between items-center mb-4 flex-wrap gap-3">
				<h4 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
					<Calendar className="w-5 h-5" />
					Expenses by Category
				</h4>
				<DateFilterPills value={filter} onChange={setFilter} />
			</div>

			<div className="overflow-x-auto scrollbar-hide">
				<ResponsiveContainer
					width="100%"
					minWidth={chartWidth}
					height={360}
				>
					<BarChart
						data={data}
						margin={{ top: 24, right: 12, bottom: 8, left: 8 }}
					>
						<XAxis
							dataKey="group"
							interval={0}
							tickLine={false}
							tick={
								<CategoryColumnTick
									maxLabelLength={maxLabelLength}
								/>
							}
						/>
						<YAxis tickFormatter={formatCurrency} width={64} />
						<Tooltip
							formatter={(v, _name, item) => {
								const amount =
									typeof v === "number" ? v : Number(v) || 0;
								const percentage = item?.payload?.percentage as
									| number
									| undefined;
								return [
									`${formatCurrency(amount)}${percentage !== undefined ? ` (${percentage.toFixed(1)}%)` : ""}`,
									"Amount",
								];
							}}
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
						<Bar
							dataKey="amount"
							radius={[4, 4, 0, 0]}
							label={<PercentageBarLabel />}
						>
							{data.map((_, i) => (
								<Cell key={i} fill={getCategoryColor(i)} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export default ExpensesByCategoryBar;

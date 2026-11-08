import { FC } from "react";
import { format, parse } from "date-fns";
import type { YearlyTotals } from "@src/features/finance/budget_planning/lib/yearlyTotals";

interface YearlySummaryProps {
	totals: YearlyTotals;
}

const money = (value: number): string =>
	value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const monthName = (month: string): string =>
	format(parse(`${month}-01`, "yyyy-MM-dd", new Date()), "MMM");

const Tile: FC<{ label: string; value: string; hint?: string; tone?: string }> = ({
	label,
	value,
	hint,
	tone = "text-gray-900 dark:text-white",
}) => (
	<div className="rounded-lg border bg-white/20 p-3 dark:bg-black/20">
		<p className="text-xs text-gray-600 dark:text-gray-300">{label}</p>
		<p className={`text-xl font-semibold ${tone}`}>{value}</p>
		{hint && <p className="text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>}
	</div>
);

/** Annual totals: what came in, what went out, and what a shortfall costs your savings. */
const YearlySummary: FC<YearlySummaryProps> = ({ totals }) => {
	const short = totals.coveredFromSavings > 0;

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Tile
					label="Income"
					value={money(totals.income)}
					hint={
						totals.estimatedIncome > 0
							? `${money(totals.estimatedIncome)} estimated from salary`
							: undefined
					}
				/>
				<Tile
					label="Spent so far"
					value={money(totals.spent)}
					hint={
						totals.upcomingRecurring > 0
							? `+ ${money(totals.upcomingRecurring)} recurring still due`
							: undefined
					}
				/>
				<Tile label="Planned savings" value={money(totals.plannedSavings)} />
				<Tile
					label={short ? "Shortfall" : "Left over"}
					value={money(Math.abs(totals.result))}
					tone={short ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}
				/>
			</div>

			{short && (
				<p
					role="status"
					className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
				>
					Spending is more than income this year.{" "}
					<strong>{money(totals.coveredFromSavings)}</strong> comes out of savings.
					{totals.overspentMonths.length > 0 &&
						` Months over income: ${totals.overspentMonths.map(monthName).join(", ")}.`}
				</p>
			)}

			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full text-sm">
					<caption className="sr-only">Planned and spent per category for {totals.year}</caption>
					<thead className="text-left text-xs text-gray-600 dark:text-gray-300">
						<tr>
							<th className="p-2">Category</th>
							<th className="p-2 text-right">Planned</th>
							<th className="p-2 text-right">Spent</th>
							<th className="p-2 text-right">Difference</th>
						</tr>
					</thead>
					<tbody>
						{totals.rows.map((row) => (
							<tr key={row.key} className="border-t">
								<td className="p-2">{row.name}</td>
								<td className="p-2 text-right">{money(row.planned)}</td>
								<td className="p-2 text-right">{money(row.spent)}</td>
								<td
									className={`p-2 text-right ${
										row.difference < 0 ? "text-red-700 dark:text-red-300" : ""
									}`}
								>
									{row.difference < 0 ? "-" : ""}
									{money(Math.abs(row.difference))}
								</td>
							</tr>
						))}
						<tr className="border-t">
							<td className="p-2 italic">Not in any category</td>
							<td className="p-2 text-right">–</td>
							<td className="p-2 text-right">{money(totals.unassigned)}</td>
							<td className="p-2" />
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default YearlySummary;

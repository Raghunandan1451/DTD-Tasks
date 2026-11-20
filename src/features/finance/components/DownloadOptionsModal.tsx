import React, { useState } from "react";
import Button from "@src/components/ui/button/Button";
import type { FinanceExportReportScope } from "@src/lib/utils/downloadHandler";
import {
	currentPeriods,
	monthKeyOf,
	parsePeriod,
	quarterOf,
	type ReportPeriod,
} from "@src/features/finance/lib/reportPeriods";

interface DownloadOptionsModalProps {
	isExporting: boolean;
	onSelect: (scope: FinanceExportReportScope) => void;
	onCancel: () => void;
}

const QUICK = "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60";
const FIELD =
	"rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white";

/**
 * Pick what the report covers: this month, this quarter or this year in one
 * click, or choose another month, quarter or year.
 */
const DownloadOptionsModal: React.FC<DownloadOptionsModalProps> = ({
	isExporting,
	onSelect,
	onCancel,
}) => {
	const now = new Date();
	const current = currentPeriods(now);
	const [kind, setKind] = useState<ReportPeriod["kind"]>("month");
	const [month, setMonth] = useState(monthKeyOf(now));
	const [year, setYear] = useState(String(now.getFullYear()));
	const [quarter, setQuarter] = useState(String(quarterOf(now)));
	const chosen = parsePeriod(kind, { month, year: Number(year), quarter: Number(quarter) });

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="mx-4 w-full max-w-md rounded-lg border border-white/20 bg-white/95 p-4 shadow-2xl dark:border-white/10 dark:bg-gray-800/95">
				<h2 className="text-lg font-semibold text-gray-800 dark:text-white">
					{window.desktop ? "Save Reports as PDF" : "Download Reports"}
				</h2>
				<p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Current period</p>
				<div className="mt-2 grid gap-2 sm:grid-cols-3">
					<Button
						type="button"
						className={`${QUICK} bg-blue-500 hover:bg-blue-600`}
						onClick={() => onSelect(current.month)}
						disabled={isExporting}
						text="This month"
					/>
					<Button
						type="button"
						className={`${QUICK} bg-green-500 hover:bg-green-600`}
						onClick={() => onSelect(current.quarter)}
						disabled={isExporting}
						text="This quarter"
					/>
					<Button
						type="button"
						className={`${QUICK} bg-purple-500 hover:bg-purple-600`}
						onClick={() => onSelect(current.year)}
						disabled={isExporting}
						text="This year"
					/>
				</div>

				<p className="mt-4 text-sm text-gray-700 dark:text-gray-300">Or choose another</p>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<select
						aria-label="Report type"
						className={FIELD}
						value={kind}
						onChange={(event) => setKind(event.target.value as ReportPeriod["kind"])}
						disabled={isExporting}
					>
						<option value="month">Month</option>
						<option value="quarter">Quarter</option>
						<option value="year">Year</option>
					</select>
					{kind === "month" && (
						<input
							type="month"
							aria-label="Month"
							className={FIELD}
							value={month}
							onChange={(event) => setMonth(event.target.value)}
							disabled={isExporting}
						/>
					)}
					{kind === "quarter" && (
						<select
							aria-label="Quarter"
							className={FIELD}
							value={quarter}
							onChange={(event) => setQuarter(event.target.value)}
							disabled={isExporting}
						>
							<option value="1">Q1 (Jan–Mar)</option>
							<option value="2">Q2 (Apr–Jun)</option>
							<option value="3">Q3 (Jul–Sep)</option>
							<option value="4">Q4 (Oct–Dec)</option>
						</select>
					)}
					{kind !== "month" && (
						<input
							type="number"
							aria-label="Year"
							className={`${FIELD} w-24`}
							min={1970}
							max={9999}
							value={year}
							onChange={(event) => setYear(event.target.value)}
							disabled={isExporting}
						/>
					)}
					<Button
						type="button"
						className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
						onClick={() => chosen && onSelect(chosen)}
						disabled={isExporting || !chosen}
						text={window.desktop ? "Save" : "Download"}
					/>
				</div>

				<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
					<Button
						type="button"
						className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						onClick={() => onSelect("allMonths")}
						disabled={isExporting}
						text="All months"
					/>
					<Button
						type="button"
						className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						onClick={onCancel}
						disabled={isExporting}
						text={isExporting ? "Working..." : "Cancel"}
					/>
				</div>
			</div>
		</div>
	);
};

export default DownloadOptionsModal;

import React from "react";
import type { SummarizedPoint } from "@src/features/finance/lib/summarizeFlatRuns";

const formatCurrency = (val: number) => val.toLocaleString();
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

const tooltipBoxStyle: React.CSSProperties = {
	backgroundColor: "var(--tooltip-bg)",
	borderRadius: "8px",
	padding: "8px 12px",
	color: "var(--tooltip-text)",
};

interface BalanceTrendTooltipProps {
	active?: boolean;
	payload?: Array<{ payload: SummarizedPoint }>;
}

/**
 * Custom tooltip for BalanceTrendChart. Summarized flat-run boundary
 * points (see summarizeFlatRuns.ts) get a "no activity from X to Y"
 * message instead of the normal single-day credit/debit/balance
 * breakdown, since that point doesn't represent just one real day.
 *
 * Uses an explicit local props type instead of recharts' generic
 * TooltipProps<number, string> -- destructuring against that generic
 * type caused a parse error in this project's JSX/TS setup, plus
 * `payload` isn't reliably present on that generic alias anyway.
 */
const BalanceTrendTooltip: React.FC<BalanceTrendTooltipProps> = ({
	active,
	payload,
}) => {
	if (!active || !payload || payload.length === 0) return null;

	const point = payload[0]?.payload;
	if (!point) return null;

	if (point.summarizedRange) {
		return (
			<div style={tooltipBoxStyle}>
				<div style={{ color: "var(--tooltip-label)" }}>
					{formatDate(point.summarizedRange.start)} -{" "}
					{formatDate(point.summarizedRange.end)}
				</div>
				<div>No debit or credit in this range</div>
				<div>Balance: {formatCurrency(point.balance)}</div>
			</div>
		);
	}

	return (
		<div style={tooltipBoxStyle}>
			<div style={{ color: "var(--tooltip-label)" }}>
				{formatDate(point.date)}
			</div>
			<div>Balance: {formatCurrency(point.balance)}</div>
			{point.credit > 0 && (
				<div>Credit: {formatCurrency(point.credit)}</div>
			)}
			{point.debit > 0 && <div>Debit: {formatCurrency(point.debit)}</div>}
		</div>
	);
};

export default BalanceTrendTooltip;

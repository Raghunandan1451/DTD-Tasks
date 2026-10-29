import React from "react";
import Button from "@src/components/ui/button/Button";
import type { FinanceExportReportScope } from "@src/lib/utils/downloadHandler";

interface DownloadOptionsModalProps {
	isExporting: boolean;
	onSelect: (scope: FinanceExportReportScope) => void;
	onCancel: () => void;
}

/**
 * Extracted from ExpenseTracker.tsx's inline JSX so the container
 * component doesn't mix data orchestration with modal markup.
 */
const DownloadOptionsModal: React.FC<DownloadOptionsModalProps> = ({
	isExporting,
	onSelect,
	onCancel,
}) => {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="mx-4 w-full max-w-md rounded-lg border border-white/20 bg-white/95 p-4 shadow-2xl dark:border-white/10 dark:bg-gray-800/95">
				<h2 className="text-lg font-semibold text-gray-800 dark:text-white">
					Download Reports
				</h2>
				<p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
					Select report range.
				</p>
				<div className="mt-4 grid gap-3 sm:grid-cols-2">
					<Button
						type="button"
						className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
						onClick={() => onSelect("allMonths")}
						disabled={isExporting}
						text="All months"
					/>
					<Button
						type="button"
						className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-60"
						onClick={() => onSelect("lastTwoMonths")}
						disabled={isExporting}
						text="Last 2 months"
					/>
				</div>
				<div className="mt-4 flex justify-end">
					<Button
						type="button"
						className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						onClick={onCancel}
						disabled={isExporting}
						text={isExporting ? "Downloading..." : "Cancel"}
					/>
				</div>
			</div>
		</div>
	);
};

export default DownloadOptionsModal;

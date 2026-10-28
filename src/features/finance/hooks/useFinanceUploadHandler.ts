import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@src/lib/store/store";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";
import { setExpenses } from "@src/lib/store/slices/expensesSlice";
import {
	mergeParsedBackups,
	parseFinanceBackupText,
} from "@src/features/finance/lib/financeBackup";
import { UploadError } from "@src/lib/utils/uploadError";

const describeRestore = (
	hasFinance: boolean,
	expenseCount: number | undefined,
	skipped: number,
): string => {
	const parts = [
		expenseCount !== undefined ? `${expenseCount} expenses` : null,
		hasFinance ? "finance settings" : null,
	].filter(Boolean);
	const skippedNote = skipped > 0 ? ` (${skipped} invalid entries skipped)` : "";
	return `Restored ${parts.join(" and ")}${skippedNote}`;
};

/**
 * Restores finance data from one or several JSON files: the combined
 * finance-backup.json, or the older finance-data.json / expenses-data.json
 * (picked together or one at a time). File types are detected from their
 * content, and every file is validated before anything is dispatched, so a
 * bad file never leaves a half-restored state. Returns the success message.
 */
export const useFinanceUploadHandler = () => {
	const dispatch = useDispatch<AppDispatch>();

	return useCallback(
		async (files: File[]): Promise<string> => {
			let merged;
			try {
				const texts = await Promise.all(files.map((file) => file.text()));
				merged = mergeParsedBackups(
					texts.map((text, index) =>
						parseFinanceBackupText(text, files[index].name),
					),
				);
			} catch (error) {
				throw new UploadError(
					error instanceof Error ? error.message : "Failed to read file",
				);
			}

			if (merged.finance) dispatch(setFinanceState(merged.finance));
			if (merged.expenses) dispatch(setExpenses(merged.expenses));

			return describeRestore(
				Boolean(merged.finance),
				merged.expenses?.length,
				merged.skippedEntries,
			);
		},
		[dispatch],
	);
};

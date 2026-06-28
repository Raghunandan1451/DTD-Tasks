import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@src/lib/store/store";
import { handleJSONUpload } from "@src/lib/utils/downloadHandler";
import { setFinanceState } from "@src/lib/store/slices/financeSlice";
import { setExpenses } from "@src/lib/store/slices/expensesSlice";
import type { FinanceState } from "@src/features/finance/type";
import type { ExpensesData } from "@src/lib/types/downloadHandlerTypes";
import type { ShowNotificationFn } from "@src/lib/types/downloadHandlerTypes";

/**
 * Routes an uploaded JSON file to the right restore handler (finance vs.
 * expenses) based on its filename, then dispatches the parsed data.
 *
 * Extracted from ExpenseTracker.tsx. Checks "expense" before "finance"
 * so a name like "expenses-and-finance-backup.json" still resolves to
 * expenses rather than silently matching "finance" first -- the
 * original substring check had this ordering risk.
 */
export const useFinanceUploadHandler = (
	showNotification: ShowNotificationFn,
) => {
	const dispatch = useDispatch<AppDispatch>();

	return useCallback(
		async (file: File) => {
			const fileName = file.name.toLowerCase();

			if (fileName.includes("expense")) {
				return handleJSONUpload<ExpensesData>(
					file,
					(data) => {
						dispatch(setExpenses(data.expenses));
						showNotification(
							"Expenses data restored successfully",
							"success",
						);
					},
					(error) => showNotification(error, "error"),
					showNotification,
				);
			}

			if (fileName.includes("finance")) {
				return handleJSONUpload<FinanceState>(
					file,
					(data) => {
						dispatch(setFinanceState(data));
						showNotification(
							"Finance data restored successfully",
							"success",
						);
					},
					(error) => showNotification(error, "error"),
					showNotification,
				);
			}

			showNotification(
				"Please select a finance or expense JSON file",
				"error",
			);
		},
		[dispatch, showNotification],
	);
};

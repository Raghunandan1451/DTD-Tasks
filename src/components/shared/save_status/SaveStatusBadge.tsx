import { FC } from "react";
import { retryFailedSaves } from "@src/lib/utils/persistMiddleware";
import { useSaveStatus } from "@src/lib/utils/saveStatus";

/** A small "Saving… / Saved / Could not save" label with a Retry button when a save failed. */
const SaveStatusBadge: FC = () => {
	const { state, message } = useSaveStatus();
	if (state === "idle") return null;
	if (state === "error") {
		return (
			<span role="alert" className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 md:text-sm">
				<span title={message ?? undefined}>Could not save{message ? `: ${message}` : ""}</span>
				<button type="button" className="underline" onClick={() => void retryFailedSaves()}>
					Retry
				</button>
			</span>
		);
	}
	return (
		<span role="status" className="text-xs text-gray-600 dark:text-gray-300 md:text-sm">
			{state === "saving" ? "Saving…" : "Saved"}
		</span>
	);
};

export default SaveStatusBadge;

import { AlertTriangle, Check, Loader2 } from "lucide-react";
import type { SaveStatus } from "@src/features/nodes/lib/useAutosave";

const LABEL: Record<SaveStatus, string> = {
	saved: "Saved",
	saving: "Saving…",
	error: "Not saved",
};

const SaveIndicator: React.FC<{ status: SaveStatus }> = ({ status }) => (
	<span
		role="status"
		aria-live="polite"
		className={`inline-flex items-center gap-1 text-xs ${
			status === "error" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"
		}`}
	>
		{status === "saved" && <Check className="h-3.5 w-3.5" />}
		{status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
		{status === "error" && <AlertTriangle className="h-3.5 w-3.5" />}
		{LABEL[status]}
	</span>
);

export default SaveIndicator;

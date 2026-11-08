import React, { useState } from "react";
import { Upload } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import { useFilePicker } from "@src/lib/hooks/useFilePicker";
import { importTimelineFile } from "@src/features/home/lib/timelineBackup";
import { UploadError } from "@src/lib/utils/uploadError";

interface TimelineImportButtonProps {
	showNotification: (
		message: string,
		type?: "info" | "error" | "success",
	) => void;
	/** Called after rows were merged, so the feed and counts can reload. */
	onImported: () => void;
}

/** Merges a Timeline backup (.json) into the notes and activity already stored. */
const TimelineImportButton: React.FC<TimelineImportButtonProps> = ({
	showNotification,
	onImported,
}) => {
	const [busy, setBusy] = useState(false);

	const { open, inputProps } = useFilePicker({
		accept: ".json,application/json",
		onFiles: (files) => handleFile(files[0]),
	});

	const handleFile = async (file: File) => {
		setBusy(true);
		try {
			const message = await importTimelineFile(file);
			showNotification(message, "success");
			onImported();
		} catch (error) {
			if (error instanceof UploadError) {
				showNotification(error.message, "error");
			} else {
				console.error("[timeline] Import failed", error);
				showNotification("Could not import the timeline backup", "error");
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<Input
				id="timelineBackupFile"
				aria-label="Timeline backup file"
				{...inputProps}
			/>
			<Button
				type="button"
				onClick={open}
				disabled={busy}
				aria-label="Import timeline backup"
				title="Import a Timeline backup (.json)"
				className="btn-secondary flex items-center gap-1.5 text-xs md:text-base py-1.5 md:py-2 px-2.5 md:px-4 rounded-lg"
			>
				<Upload className="w-4 h-4" />
				<span>{busy ? "Importing..." : "Import"}</span>
			</Button>
		</>
	);
};

export default TimelineImportButton;

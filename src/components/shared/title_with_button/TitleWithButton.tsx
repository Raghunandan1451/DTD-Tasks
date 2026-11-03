import React, { useState } from "react";
import Button from "@src/components/ui/button/Button";
import Input from "@src/components/ui/input/Input";
import { useFilePicker } from "@src/lib/hooks/useFilePicker";
import { UploadError } from "@src/lib/utils/uploadError";

type ShowNotificationFn = (
	message: string,
	type?: "error" | "success" | "info"
) => void;

interface TitleWithButtonProps {
	heading: string;
	onDownload:
		| (() => Promise<void> | void)
		| ((heading: string) => Promise<void> | void);
	/** Return a string to use it as the success message instead of the default */
	onUpload?: (file: File, heading: string) => Promise<string | void> | string | void;
	/** Takes several files at once; enables multi-select in the file picker */
	onUploadFiles?: (
		files: File[],
		heading: string
	) => Promise<string | void> | string | void;
	buttonText: string;
	showUpload?: boolean;
	containerClass?: string;
	showNotification?: ShowNotificationFn;
}

const TitleWithButton: React.FC<TitleWithButtonProps> = ({
	heading,
	onDownload,
	onUpload,
	onUploadFiles,
	buttonText,
	showUpload = false,
	containerClass,
	showNotification,
}) => {
	const [isDownloading, setIsDownloading] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	const handleDownloadClick = async () => {
		setIsDownloading(true);
		try {
			if (onDownload.length === 0) {
				await (onDownload as () => Promise<void> | void)();
			} else {
				await (onDownload as (heading: string) => Promise<void> | void)(
					heading
				);
			}
		} catch (error) {
			console.error("Download error:", error);
			showNotification?.(`Failed to download data`, "error");
		} finally {
			setIsDownloading(false);
		}
	};

	const handleFiles = async (files: File[]) => {
		if (!(onUploadFiles || onUpload)) return;

		setIsUploading(true);
		try {
			const message = onUploadFiles
				? await onUploadFiles(files, heading)
				: await onUpload?.(files[0], heading);
			showNotification?.(
				typeof message === "string" ? message : `Data restored successfully!`,
				"success"
			);
		} catch (error) {
			console.error("Upload error:", error);
			showNotification?.(
				error instanceof UploadError ? error.message : `Failed to restore data`,
				"error"
			);
		} finally {
			setIsUploading(false);
		}
	};

	const { open: handleUploadClick, inputProps } = useFilePicker({
		accept: ".json",
		multiple: Boolean(onUploadFiles),
		onFiles: handleFiles,
	});

	return (
		<div
			className={`frosted-panel flex-row flex-wrap items-center gap-x-2 gap-y-1 ${
				containerClass || ""
			}`}
		>
			<h1 className="panel-title text-xl md:text-4xl">
				{heading.toUpperCase()}
			</h1>
			<div className="flex gap-1.5 md:gap-3 items-center">
				<Button
					type="button"
					className="btn-primary text-xs md:text-base py-1.5 md:py-2 px-2.5 md:px-4"
					onClick={handleDownloadClick}
					text={isDownloading ? "Downloading..." : buttonText}
					disabled={isDownloading || isUploading}
				/>
				{showUpload && (
					<>
						<Button
							type="button"
							className="btn-secondary text-xs md:text-base py-1.5 md:py-2 px-2.5 md:px-4"
							onClick={handleUploadClick}
							text={isUploading ? "Uploading..." : "Upload JSON"}
							disabled={isDownloading || isUploading}
						/>
						<Input
							id={`upload-${heading}`}
							aria-label={`Upload ${heading} JSON`}
							{...inputProps}
							disabled={isDownloading || isUploading}
						/>
					</>
				)}
			</div>
		</div>
	);
};

export default TitleWithButton;

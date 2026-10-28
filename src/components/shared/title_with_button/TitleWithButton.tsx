import React, { useState, useRef } from "react";
import Button from "@src/components/ui/button/Button";
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
	const fileInputRef = useRef<HTMLInputElement | null>(null);

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

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (files.length === 0 || !(onUploadFiles || onUpload)) return;

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
			// Reset so picking the same file again after a failure still fires onChange
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			setIsUploading(false);
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div
			className={`frosted-panel flex-col md:flex-row gap-3 md:gap-0 items-start md:items-center ${
				containerClass || ""
			}`}
		>
			<h1 className="panel-title text-2xl md:text-4xl">
				{heading.toUpperCase()}
			</h1>
			<div className="flex gap-2 md:gap-3 items-center w-full md:w-auto">
				<Button
					type="button"
					className="btn-primary flex-1 md:flex-initial text-sm md:text-base py-2 px-3 md:px-4"
					onClick={handleDownloadClick}
					text={isDownloading ? "Downloading..." : buttonText}
					disabled={isDownloading || isUploading}
				/>
				{showUpload && (
					<>
						<Button
							type="button"
							className="btn-secondary flex-1 md:flex-initial text-sm md:text-base py-2 px-3 md:px-4"
							onClick={handleUploadClick}
							text={isUploading ? "Uploading..." : "Upload JSON"}
							disabled={isDownloading || isUploading}
						/>
						<input
							ref={fileInputRef}
							type="file"
							accept=".json"
							multiple={Boolean(onUploadFiles)}
							className="hidden"
							onChange={handleFileChange}
							disabled={isDownloading || isUploading}
						/>
					</>
				)}
			</div>
		</div>
	);
};

export default TitleWithButton;

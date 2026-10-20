import React, { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import Button from "@src/components/ui/button/Button";

type ShowNotificationFn = (
	message: string,
	type?: "error" | "success" | "info"
) => void;

interface TitleWithButtonProps {
	heading: string;
	onDownload?:
		| ((heading: string) => Promise<void> | void)
		| (() => Promise<void> | void);
	buttonText?: string;
	onUpload?: (file: File, heading: string) => Promise<void> | void;
	showUpload?: boolean;
	uploadAccept?: string;
	containerClass?: string;
	showNotification?: ShowNotificationFn;
	onRefresh?: () => Promise<void> | void;
	isRefreshing?: boolean;
}

export const TitleWithButton: React.FC<TitleWithButtonProps> = ({
	heading,
	onDownload,
	buttonText,
	onUpload,
	showUpload = false,
	uploadAccept = ".json",
	containerClass,
	showNotification,
	onRefresh,
	isRefreshing = false,
}) => {
	const [isDownloading, setIsDownloading] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDownloadClick = async () => {
		if (!onDownload) return;
		setIsDownloading(true);
		try {
			await onDownload(heading);
		} catch (error) {
			console.error("Download error:", error);
			showNotification?.(`Failed to download data`, "error");
		} finally {
			setIsDownloading(false);
		}
	};

	const handleUploadChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file || !onUpload) return;
		setIsUploading(true);
		try {
			await onUpload(file, heading);
			showNotification?.("Data restored successfully.", "success");
		} catch (error) {
			console.error("Upload error:", error);
			showNotification?.(
				error instanceof Error
					? error.message
					: "Failed to restore data.",
				"error",
			);
		} finally {
			event.target.value = "";
			setIsUploading(false);
		}
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
			{(onDownload || onRefresh || showUpload) && (
				<div className="flex gap-2 md:gap-3 items-center w-full md:w-auto">
					{onRefresh && (
						<Button
							type="button"
							className="btn-primary flex-1 md:flex-initial text-sm md:text-base py-2 px-3 md:px-4 inline-flex items-center justify-center gap-2"
							onClick={() => void onRefresh()}
							text={isRefreshing ? "Refreshing..." : "Refresh"}
							disabled={isRefreshing}
							title="Refresh Markdown files from the selected folder"
							aria-label="Refresh Markdown files"
						>
							<RefreshCw
								className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
							/>
						</Button>
					)}
					{onDownload && (
						<Button
							type="button"
							className="btn-primary flex-1 md:flex-initial text-sm md:text-base py-2 px-3 md:px-4"
							onClick={handleDownloadClick}
							text={isDownloading ? "Working..." : buttonText ?? "Download"}
							disabled={isDownloading || isUploading}
						/>
					)}
					{showUpload && onUpload && (
						<>
							<Button
								type="button"
								className="btn-secondary flex-1 md:flex-initial text-sm md:text-base py-2 px-3 md:px-4"
								onClick={() => fileInputRef.current?.click()}
								text={isUploading ? "Uploading..." : "Upload JSON"}
								disabled={isDownloading || isUploading}
							/>
							<input
								ref={fileInputRef}
								type="file"
								accept={uploadAccept}
								className="hidden"
								onChange={(event) =>
									void handleUploadChange(event)
								}
								disabled={isDownloading || isUploading}
							/>
						</>
					)}
				</div>
			)}
		</div>
	);
};

export default TitleWithButton;

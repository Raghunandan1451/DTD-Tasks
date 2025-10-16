import React, { useState, useRef } from "react";
import Button from "@src/components/ui/button/Button";

type ShowNotificationFn = (
	message: string,
	type?: "error" | "success" | "info"
) => void;

interface TitleWithButtonProps {
	heading: string;
	onDownload:
		| (() => Promise<void> | void)
		| ((heading: string) => Promise<void> | void);
	onUpload?: (file: File, heading: string) => Promise<void> | void;
	buttonText: string;
	showUpload?: boolean;
	containerClass?: string;
	showNotification?: ShowNotificationFn;
}

export const TitleWithButton: React.FC<TitleWithButtonProps> = ({
	heading,
	onDownload,
	onUpload,
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
		const file = e.target.files?.[0];
		if (!file || !onUpload) return;

		setIsUploading(true);
		try {
			await onUpload(file, heading);
			showNotification?.(`Data restored successfully!`, "success");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} catch (error) {
			console.error("Upload error:", error);
			showNotification?.(`Failed to restore data`, "error");
		} finally {
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

import React, { useState } from "react";
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
	containerClass?: string;
	showNotification?: ShowNotificationFn;
	onRefresh?: () => Promise<void> | void;
	isRefreshing?: boolean;
}

export const TitleWithButton: React.FC<TitleWithButtonProps> = ({
	heading,
	onDownload,
	buttonText,
	containerClass,
	showNotification,
	onRefresh,
	isRefreshing = false,
}) => {
	const [isDownloading, setIsDownloading] = useState(false);

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

	return (
		<div
			className={`frosted-panel flex-col md:flex-row gap-3 md:gap-0 items-start md:items-center ${
				containerClass || ""
			}`}
		>
			<h1 className="panel-title text-2xl md:text-4xl">
				{heading.toUpperCase()}
			</h1>
			{(onDownload || onRefresh) && (
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
							disabled={isDownloading}
						/>
					)}
				</div>
			)}
		</div>
	);
};

export default TitleWithButton;

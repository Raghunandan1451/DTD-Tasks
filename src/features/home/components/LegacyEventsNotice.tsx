import React from "react";
import Button from "@src/components/ui/button/Button";
import { useLegacyEvents } from "@src/features/home/lib/useLegacyEvents";

interface LegacyEventsNoticeProps {
	showNotification?: (
		message: string,
		type?: "error" | "success" | "info",
	) => void;
}

const LegacyEventsNotice: React.FC<LegacyEventsNoticeProps> = ({
	showNotification,
}) => {
	const { hasLegacyEvents, download, skip } =
		useLegacyEvents(showNotification);

	if (!hasLegacyEvents) return null;

	return (
		<div
			role="region"
			aria-label="Events removed"
			className="glassmorphic-bg rounded-xl border border-white/20 p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3"
		>
			<div className="flex-1">
				<h2 className="font-semibold text-gray-800 dark:text-gray-200">
					Events has been removed
				</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Your old events are still saved on this device. Download
					them as JSON before they are deleted.
				</p>
			</div>
			<div className="flex gap-2">
				<Button
					type="button"
					className="btn-primary text-sm py-2 px-3"
					onClick={download}
					text="Download"
				/>
				<Button
					type="button"
					className="btn-secondary text-sm py-2 px-3"
					onClick={skip}
					text="Skip"
				/>
			</div>
		</div>
	);
};

export default LegacyEventsNotice;

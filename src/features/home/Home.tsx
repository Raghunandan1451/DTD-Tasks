import React from "react";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import { useHomeDownload } from "@src/features/home/lib/useHomeDownload";
import { SECTIONS } from "@src/features/home/lib/types";
import DownloadMenu from "@src/features/home/components/DownloadMenu";
import ProgressBar from "@src/features/home/components/ProgressBar";
import LegacyEventsNotice from "@src/features/home/components/LegacyEventsNotice";

const Home: React.FC = () => {
	const { notifications, showNotification } = useNotifications();

	const {
		isDownloading,
		downloadProgress,
		selected,
		isDataLoaded,
		stats,
		toggleSection,
		handleDownloadSelected,
		getButtonText,
		setSelected,
	} = useHomeDownload(showNotification);

	return (
		<>
			<div className="frosted-panel relative z-20 flex-col md:flex-row gap-3 md:gap-0 items-start md:items-center">
				<div>
					<h1 className="panel-title text-2xl md:text-4xl">HOME</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Activity &amp; Journal
					</p>
				</div>
				<DownloadMenu
					selected={selected}
					isDataLoaded={isDataLoaded}
					stats={stats}
					isDownloading={isDownloading}
					buttonText={getButtonText()}
					onToggle={toggleSection}
					onSelectAll={() => setSelected(new Set(SECTIONS))}
					onDownload={handleDownloadSelected}
				/>
			</div>

			<div className="px-2 pt-2">
				<LegacyEventsNotice showNotification={showNotification} />
			</div>

			{isDownloading && (
				<div className="flex justify-center px-2 pt-4">
					<ProgressBar progress={downloadProgress} />
				</div>
			)}

			<div className="flex flex-col items-center justify-center h-full glassmorphic-bg rounded-l-lg p-6 text-center">
				<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-1">
					Your timeline will appear here
				</h2>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Journal notes, expenses and file activity are coming soon.
				</p>
			</div>

			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default Home;

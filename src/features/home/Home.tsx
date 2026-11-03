import React, { useState } from "react";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import { useHomeDownload } from "@src/features/home/lib/useHomeDownload";
import { SECTIONS } from "@src/features/home/lib/types";
import DownloadMenu from "@src/features/home/components/DownloadMenu";
import ProgressBar from "@src/features/home/components/ProgressBar";
import TimelineImportButton from "@src/features/home/components/TimelineImportButton";
import LegacyEventsNotice from "@src/features/home/components/LegacyEventsNotice";
import Timeline from "@src/features/home/components/timeline/Timeline";

const Home: React.FC = () => {
	const { notifications, showNotification } = useNotifications();
	// Bumped after an import: remounting the feed makes it reload its data.
	const [feedVersion, setFeedVersion] = useState(0);

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
		refreshTimelineCount,
	} = useHomeDownload(showNotification);

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="frosted-panel relative z-20 shrink-0 flex-row flex-wrap items-center gap-x-2 gap-y-1">
				<div>
					<h1 className="panel-title text-xl md:text-4xl">HOME</h1>
					<p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
						Activity &amp; Journal
					</p>
				</div>
				<div className="flex items-center gap-2">
				<TimelineImportButton
					showNotification={showNotification}
					onImported={() => {
						refreshTimelineCount();
						setFeedVersion((value) => value + 1);
					}}
				/>
				<DownloadMenu
					selected={selected}
					isDataLoaded={isDataLoaded}
					stats={stats}
					isDownloading={isDownloading}
					buttonText={getButtonText()}
					onToggle={toggleSection}
					onSelectAll={() => setSelected(new Set(SECTIONS))}
					onDeselectAll={() => setSelected(new Set())}
					onDownload={handleDownloadSelected}
				/>
				</div>
			</div>

			<div className="shrink-0 px-2 pt-2 empty:hidden">
				<LegacyEventsNotice showNotification={showNotification} />
			</div>

			{isDownloading && (
				<div className="flex shrink-0 justify-center px-2 pt-4">
					<ProgressBar progress={downloadProgress} />
				</div>
			)}

			<Timeline key={feedVersion} showNotification={showNotification} />

			<NotificationCenter notifications={notifications} />
		</div>
	);
};

export default Home;

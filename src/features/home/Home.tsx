import React from "react";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import { useHomeDownload } from "@src/features/home/lib/useHomeDownload";
import { SECTIONS } from "@src/features/home/lib/types";
import SectionCards from "@src/features/home/components/SectionCards";
import ProgressBar from "@src/features/home/components/ProgressBar";

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
			<TitleWithButton
				heading="List Manager"
				onDownload={handleDownloadSelected}
				buttonText={getButtonText()}
				showUpload={false}
				showNotification={showNotification}
			/>

			<div className="flex flex-col items-center justify-center h-full glassmorphic-bg rounded-l-lg p-6">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
						Welcome to Your Utility Toolkit
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{selected.size === 0
							? "Select sections to download"
							: `${selected.size} section${selected.size > 1 ? "s" : ""} selected`}
					</p>
				</div>

				{isDownloading && <ProgressBar progress={downloadProgress} />}

				<SectionCards
					selected={selected}
					isDataLoaded={isDataLoaded}
					stats={stats}
					onToggle={toggleSection}
					onSelectAll={() => setSelected(new Set(SECTIONS))}
					onDeselectAll={() => setSelected(new Set())}
				/>

				<div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md w-full">
					<p className="text-sm text-blue-800 dark:text-blue-200 text-center">
						💡 <strong>Tip:</strong> Click cards to select sections,
						then hit Download to export only what you need.
					</p>
				</div>
			</div>

			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default Home;

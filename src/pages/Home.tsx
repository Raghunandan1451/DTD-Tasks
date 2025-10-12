// ============================================
// HOME PAGE - Smart Download with Auto-Hydration
// ============================================

import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import { handleFullAppExport } from "@src/lib/utils/downloadHandler";
import { hydrateCalendar } from "@src/lib/store/thunks/calendarThunk";
import { hydrateFinance } from "@src/lib/store/thunks/financeThunk";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import { hydrateMarkdown } from "@src/lib/store/thunks/markdownThunk";
import type { RootState, AppDispatch } from "@src/lib/store/store";

interface StatCard {
	label: string;
	value: string | number;
	loaded: boolean;
}

const Home: React.FC = () => {
	const dispatch = useDispatch<AppDispatch>();
	const appState = useSelector((state: RootState) => state);
	const { notifications, showNotification } = useNotifications();

	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState(0);

	// Check if data is already loaded in Redux
	const isDataLoaded = useMemo(
		() => ({
			calendar: appState.calendar?.loaded || false,
			finance: appState.finance?.loaded || false,
			expenses: appState.expenses?.loaded || false,
			fileManager: appState.fileManager?.loaded || false,
		}),
		[appState]
	);

	// Calculate stats dynamically from Redux
	const stats: StatCard[] = useMemo(
		() => [
			{
				label: "Files",
				value: appState.fileManager?.files?.length || 0,
				loaded: isDataLoaded.fileManager,
			},
			{
				label: "Expenses",
				value: appState.expenses?.expenses?.length || 0,
				loaded: isDataLoaded.expenses,
			},
			{
				label: "Salary",
				value: appState.finance?.salary ? "✓" : "—",
				loaded: isDataLoaded.finance,
			},
			{
				label: "Events",
				value: appState.calendar?.events?.length || 0,
				loaded: isDataLoaded.calendar,
			},
		],
		[appState, isDataLoaded]
	);

	// Smart download: hydrate missing data before export
	const handleDownloadAll = async () => {
		setIsDownloading(true);
		setDownloadProgress(0);

		try {
			// Check if we need to load any data
			const needsLoading =
				!isDataLoaded.calendar ||
				!isDataLoaded.finance ||
				!isDataLoaded.expenses ||
				!isDataLoaded.fileManager;

			if (needsLoading) {
				const totalSteps = 4;
				let currentStep = 0;

				// Step 1: Load Calendar if not loaded
				if (!isDataLoaded.calendar) {
					showNotification("Loading calendar data...", "info");
					await dispatch(hydrateCalendar()).unwrap();
				}
				currentStep++;
				setDownloadProgress((currentStep / totalSteps) * 100);

				// Step 2: Load Finance if not loaded
				if (!isDataLoaded.finance) {
					showNotification("Loading finance data...", "info");
					await dispatch(hydrateFinance()).unwrap();
				}
				currentStep++;
				setDownloadProgress((currentStep / totalSteps) * 100);

				// Step 3: Load Expenses if not loaded
				if (!isDataLoaded.expenses) {
					showNotification("Loading expenses data...", "info");
					await dispatch(hydrateExpenses()).unwrap();
				}
				currentStep++;
				setDownloadProgress((currentStep / totalSteps) * 100);

				// Step 4: Load Files if not loaded
				if (!isDataLoaded.fileManager) {
					showNotification("Loading markdown files...", "info");
					await dispatch(hydrateMarkdown()).unwrap();
				}
				currentStep++;
				setDownloadProgress((currentStep / totalSteps) * 100);

				// Small delay to ensure Redux state updates
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Check if there's any data to export
			const hasData =
				(appState.calendar?.events?.length ?? 0) > 0 ||
				appState.finance?.salary ||
				(appState.expenses?.expenses?.length ?? 0) > 0 ||
				(appState.fileManager?.files?.length ?? 0) > 0;

			if (!hasData) {
				showNotification("No data available to export", "error");
				setIsDownloading(false);
				setDownloadProgress(0);
				return;
			}

			// Export
			showNotification("Creating export file...", "info");
			await handleFullAppExport(appState, showNotification);

			setDownloadProgress(100);

			// Reset progress after short delay
			setTimeout(() => {
				setDownloadProgress(0);
				setIsDownloading(false);
			}, 1000);
		} catch (error) {
			console.error("Download error:", error);
			showNotification("Failed to download data", "error");
			setIsDownloading(false);
			setDownloadProgress(0);
		}
	};

	// Calculate if all data is loaded
	const allDataLoaded =
		isDataLoaded.calendar &&
		isDataLoaded.finance &&
		isDataLoaded.expenses &&
		isDataLoaded.fileManager;

	// Dynamic button text
	const getButtonText = () => {
		if (isDownloading) {
			return `${
				allDataLoaded ? "Downloading" : "Loading"
			}... ${Math.round(downloadProgress)}%`;
		}
		return allDataLoaded ? "Download All Data" : "Load All Data";
	};

	// Calculate total items
	const totalItems = useMemo(() => {
		return stats.reduce((sum, stat) => {
			if (typeof stat.value === "number") {
				return sum + stat.value;
			}
			return sum;
		}, 0);
	}, [stats]);

	return (
		<>
			<TitleWithButton
				heading="List Manager"
				onDownload={handleDownloadAll}
				buttonText={getButtonText()}
				showUpload={false}
				showNotification={showNotification}
			/>

			<div className="flex flex-col items-center justify-center h-full glassmorphic-bg rounded-l-lg p-6">
				<div className="text-center mt-8 max-w-2xl">
					<h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
						Welcome to Your List Manager!
					</h1>

					<p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
						{totalItems > 0
							? `You have ${totalItems} items stored.`
							: "Start by adding some data!"}
					</p>

					<p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
						{isDownloading
							? "Preparing your data for download..."
							: "Click the button above to download everything in one ZIP file."}
					</p>

					{/* Progress Bar */}
					{isDownloading && (
						<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
							<div
								className="bg-blue-600 h-2 rounded-full transition-all duration-300"
								style={{ width: `${downloadProgress}%` }}
							/>
						</div>
					)}

					{/* Stats Cards */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
						{stats.map((stat) => (
							<div
								key={stat.label}
								className={`stat-card ${
									stat.loaded
										? "border-green-500 border-l-4"
										: ""
								}`}
							>
								<h3 className="font-semibold text-gray-700 dark:text-gray-300">
									{stat.label}
								</h3>
								<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
									{stat.value}
								</p>
								{stat.loaded && (
									<span className="text-xs text-green-600 dark:text-green-400">
										Loaded ✓
									</span>
								)}
							</div>
						))}
					</div>

					{/* Info Box */}
					<div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
						<p className="text-sm text-blue-800 dark:text-blue-200">
							💡 <strong>Tip:</strong> Your data is automatically
							loaded when you download. No need to visit each page
							first!
						</p>
					</div>
				</div>
			</div>

			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default Home;

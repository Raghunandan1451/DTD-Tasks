import { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
	handleCalendarExport,
	handleFinanceExport,
	handleMarkdownExport,
	handleFullAppExport,
} from "@src/lib/utils/downloadHandler";
import { hydrateCalendar } from "@src/lib/store/thunks/calendarThunk";
import { hydrateFinance } from "@src/lib/store/thunks/financeThunk";
import { hydrateExpenses } from "@src/lib/store/thunks/expenseThunk";
import { hydrateMarkdown } from "@src/lib/store/thunks/markdownThunk";
import type { RootState, AppDispatch } from "@src/lib/store/store";
import { Section, SECTIONS } from "./types";

export const useHomeDownload = (
	showNotification: (
		message: string,
		type?: "info" | "error" | "success",
	) => void,
) => {
	const dispatch = useDispatch<AppDispatch>();
	const appState = useSelector((state: RootState) => state);

	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [selected, setSelected] = useState<Set<Section>>(new Set(SECTIONS));

	const isDataLoaded = useMemo(
		() => ({
			events: appState.calendar?.loaded || false,
			finance:
				(appState.finance?.loaded || false) &&
				(appState.expenses?.loaded || false),
			files: appState.fileManager?.loaded || false,
		}),
		[appState],
	);

	const stats: Record<Section, string | number> = useMemo(
		() => ({
			events: appState.calendar?.events?.length || 0,
			finance: appState.expenses?.expenses?.length || 0,
			files: appState.fileManager?.files?.length || 0,
		}),
		[appState],
	);

	const toggleSection = (section: Section) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(section)) {
				next.delete(section);
			} else {
				next.add(section);
			}
			return next;
		});
	};

	const hydrateSection = async (
		section: Section,
		step: number,
		total: number,
	) => {
		const loaders: Record<Section, () => Promise<void>> = {
			events: async () => {
				if (!isDataLoaded.events) {
					showNotification("Loading events data...", "info");
					await dispatch(hydrateCalendar()).unwrap();
				}
			},
			finance: async () => {
				if (!isDataLoaded.finance) {
					showNotification("Loading finance data...", "info");
					await dispatch(hydrateFinance()).unwrap();
					await dispatch(hydrateExpenses()).unwrap();
				}
			},
			files: async () => {
				if (!isDataLoaded.files) {
					showNotification("Loading files data...", "info");
					await dispatch(hydrateMarkdown()).unwrap();
				}
			},
		};

		await loaders[section]();
		setDownloadProgress((step / total) * 100);
	};

	const handleDownloadSelected = async () => {
		if (selected.size === 0) {
			showNotification(
				"Select at least one section to download",
				"error",
			);
			return;
		}

		setIsDownloading(true);
		setDownloadProgress(0);

		try {
			const selectedArr = Array.from(selected);
			const total = selectedArr.length;

			for (let i = 0; i < selectedArr.length; i++) {
				await hydrateSection(selectedArr[i], i + 1, total);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));

			if (selected.size === SECTIONS.length) {
				showNotification("Creating full export...", "info");
				await handleFullAppExport(appState, showNotification);
			} else {
				showNotification("Creating export...", "info");

				if (selected.has("events")) {
					await handleCalendarExport(
						appState.calendar,
						showNotification,
					);
				}
				if (selected.has("finance")) {
					await handleFinanceExport(
						appState.finance,
						appState.expenses,
						undefined,
						undefined,
						showNotification,
					);
				}
				if (selected.has("files")) {
					await handleMarkdownExport(
						appState.fileManager?.files || [],
						showNotification,
					);
				}
			}

			setDownloadProgress(100);
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

	const getButtonText = () => {
		if (isDownloading)
			return `Downloading... ${Math.round(downloadProgress)}%`;
		if (selected.size === 0) return "Select sections";
		if (selected.size === SECTIONS.length) return "Download All";
		return `Download (${selected.size})`;
	};

	return {
		appState,
		isDownloading,
		downloadProgress,
		selected,
		isDataLoaded,
		stats,
		toggleSection,
		handleDownloadSelected,
		getButtonText,
		setSelected,
	};
};

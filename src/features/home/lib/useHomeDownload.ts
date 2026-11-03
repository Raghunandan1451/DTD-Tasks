import { useState, useMemo, useEffect, useCallback } from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import {
	handleFinanceExport,
	handleMarkdownExport,
	handleFullAppExport,
	handleTimelineExport,
} from "@src/lib/utils/downloadHandler";
import { buildTimelineBackup } from "@src/features/home/lib/timelineBackup";
import { countTimelineData } from "@src/lib/db/timelineBackupRepo";
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
	const store = useStore<RootState>();
	// Select slices individually: selecting the whole state re-renders on every
	// store change and triggers react-redux's "returned the root state" warning.
	const finance = useSelector((state: RootState) => state.finance);
	const expenses = useSelector((state: RootState) => state.expenses);
	const fileManager = useSelector((state: RootState) => state.fileManager);

	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState(0);
	// null until counted: the timeline lives in IndexedDB, not in Redux.
	const [timelineCount, setTimelineCount] = useState<number | null>(null);
	const [selected, setSelected] = useState<Set<Section>>(new Set(SECTIONS));

	const refreshTimelineCount = useCallback(() => {
		countTimelineData()
			.then(setTimelineCount)
			.catch((error: unknown) => {
				console.warn("[home] Could not count timeline rows", error);
			});
	}, []);

	useEffect(() => {
		refreshTimelineCount();
	}, [refreshTimelineCount]);

	const isDataLoaded = useMemo(
		() => ({
			finance: (finance?.loaded || false) && (expenses?.loaded || false),
			files: fileManager?.loaded || false,
			timeline: timelineCount !== null,
		}),
		[finance, expenses, fileManager, timelineCount],
	);

	const stats: Record<Section, string | number> = useMemo(
		() => ({
			finance: expenses?.expenses?.length || 0,
			files: fileManager?.files?.length || 0,
			timeline: timelineCount ?? 0,
		}),
		[expenses, fileManager, timelineCount],
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
			// Read straight from IndexedDB when the export is built.
			timeline: async () => {},
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

			// Read after hydration: the slices captured at render time are stale.
			const appState = store.getState();
			const timeline = selected.has("timeline")
				? await buildTimelineBackup()
				: undefined;

			if (selected.size === SECTIONS.length) {
				showNotification("Creating full export...", "info");
				await handleFullAppExport(appState, showNotification, timeline);
			} else {
				showNotification("Creating export...", "info");

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
				if (timeline) {
					await handleTimelineExport(timeline, showNotification);
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
	};
};

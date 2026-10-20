import React, { useEffect, useRef, useState } from "react";
import Button from "@src/components/ui/button/Button";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import { RootState } from "@src/lib/store/store";
import { useSelector } from "react-redux";
import { QRCodeCanvas } from "qrcode.react";
import {
	chooseOutputDirectory,
	getSelectedOutputDirectoryName,
} from "@src/lib/utils/fileStorage/outputDirectory";
import { supportsOutputDirectoryPicker } from "@src/lib/utils/fileStorage/outputDirectory";
import {
	downloadOutputArchive,
} from "@src/lib/utils/fileStorage/outputTransfer";
import { writeOutputFile } from "@src/lib/utils/fileStorage/outputFiles";
import { canvasToPNGBlob } from "@src/lib/utils/downloadHandler/qrExport";

const HOME_SECTIONS = [
	{ id: "events", label: "Events", directory: "Events" },
	{ id: "finance", label: "Finance & Expenses", directory: "Expenses" },
	{ id: "files", label: "Files", directory: "Markdown" },
] as const;

type HomeSection = (typeof HOME_SECTIONS)[number]["id"];

const Home: React.FC = () => {
	const { notifications, showNotification } = useNotifications();
	const appState = useSelector((state: RootState) => state);
	const [directoryName, setDirectoryName] = useState<string | null>(null);
	const [isSelecting, setIsSelecting] = useState(false);
	const [isTransferring, setIsTransferring] = useState(false);
	const [selectedSections, setSelectedSections] = useState<Set<HomeSection>>(
		new Set(HOME_SECTIONS.map(({ id }) => id)),
	);
	const qrContainerRef = useRef<HTMLDivElement>(null);
	const supportsDirectoryPicker = supportsOutputDirectoryPicker();

	useEffect(() => {
		void getSelectedOutputDirectoryName()
			.then(setDirectoryName)
			.catch((error: unknown) => {
				console.error("Unable to read selected output folder:", error);
				showNotification(
					"Unable to read output folder settings",
					"error",
				);
			});
	}, [showNotification]);

	const handleChooseDirectory = async () => {
		setIsSelecting(true);
		try {
			const name = await chooseOutputDirectory();
			setDirectoryName(name);
			showNotification(
				`Files will be saved under ${name}\\DTD_Tasks`,
				"success",
			);
		} catch (error) {
			console.error("Unable to select output folder:", error);
			showNotification(
				error instanceof Error
					? error.message
					: "Unable to select output folder",
				"error",
			);
		} finally {
			setIsSelecting(false);
		}
	};

	const handleDownload = async () => {
		if (selectedSections.size === 0) {
			showNotification("Select at least one section to download.", "info");
			return;
		}
		setIsTransferring(true);
		try {
			const downloadingAll =
				selectedSections.size === HOME_SECTIONS.length;
			if (downloadingAll && appState.qr.qrData.trim() !== "") {
				const canvas =
					qrContainerRef.current?.querySelector("canvas");
				if (!canvas) {
					throw new Error("Unable to prepare the QR image.");
				}
				await writeOutputFile(
					"QR/qr-code.png",
					await canvasToPNGBlob(canvas),
				);
			}
			if (selectedSections.has("files")) {
				await writeOutputFile(
					"Markdown/file-manager-data.json",
					JSON.stringify({ files: appState.fileManager.files }, null, 2),
				);
			}
			const directories = HOME_SECTIONS.filter(({ id }) =>
				selectedSections.has(id),
			).map(({ directory }) => directory);
			const downloaded =
				selectedSections.size === HOME_SECTIONS.length
					? await downloadOutputArchive()
					: await downloadOutputArchive(
							directories,
							"DTD_Tasks.zip",
						);
			showNotification(
				downloaded
					? "Your output files are ready."
					: "No output files are available to download yet.",
				downloaded ? "success" : "info",
			);
		} catch (error) {
			console.error("Unable to download output files:", error);
			showNotification(
				"Unable to prepare the output files. Try again.",
				"error",
			);
		} finally {
			setIsTransferring(false);
		}
	};

	const toggleSection = (section: HomeSection) => {
		setSelectedSections((previous) => {
			const next = new Set(previous);
			if (next.has(section)) next.delete(section);
			else next.add(section);
			return next;
		});
	};
	const downloadButtonText = isTransferring
		? "Preparing..."
		: selectedSections.size === 0
			? "Select sections"
			: selectedSections.size === HOME_SECTIONS.length
				? "Download All"
				: `Download (${selectedSections.size})`;

	return (
		<>
			{!supportsDirectoryPicker && appState.qr.qrData && (
				<div
					ref={qrContainerRef}
					className="hidden"
					aria-hidden="true"
				>
					<QRCodeCanvas
						value={appState.qr.qrData}
						size={300}
						marginSize={1}
						bgColor={appState.qr.bgColor}
						fgColor={appState.qr.fgColor}
						{...(appState.qr.selectedIcon.trim() !== ""
							? {
									imageSettings: {
										src: appState.qr.selectedIcon,
										x: undefined,
										y: undefined,
										height: 40,
										width: 40,
										excavate: true,
									},
								}
							: {})}
					/>
				</div>
			)}
			<TitleWithButton
				heading="List Manager"
				onDownload={
					supportsDirectoryPicker ? undefined : handleDownload
				}
				buttonText={downloadButtonText}
				showNotification={showNotification}
			/>
			{supportsDirectoryPicker ? (
				<div className="flex h-full flex-col items-center justify-center rounded-l-lg glassmorphic-bg p-6">
					<div className="mb-8 text-center">
						<h1 className="mb-2 text-4xl font-bold text-gray-800 dark:text-gray-200">
							Welcome to Your Utility Toolkit
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Your data is saved automatically.
						</p>
					</div>
					<section className="w-full max-w-xl rounded-xl border border-white/20 bg-white/30 p-5 shadow-sm backdrop-blur-md dark:bg-black/20">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							File storage
						</h2>
						<>
							<p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
								Choose a folder. The app creates an DTD_Tasks
								folder inside it and writes Events, Expenses,
								and Markdown files there.
							</p>
							<div className="mt-4 flex flex-wrap items-center gap-3">
								<Button
									type="button"
									onClick={handleChooseDirectory}
									disabled={isSelecting}
									className="btn-primary px-4 py-2 text-sm"
									text={
										isSelecting
											? "Selecting..."
											: directoryName
												? "Change folder"
												: "Select folder"
									}
								/>
								<span className="break-all text-sm text-gray-600 dark:text-gray-300">
									{directoryName
										? `${directoryName}\\DTD_Tasks`
										: "No output folder selected"}
								</span>
							</div>
							<p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
								Folder access requires a browser that supports
								the File System Access API. Access may need to
								be granted again by selecting the folder.
							</p>
						</>
					</section>
				</div>
			) : (
				<div className="flex h-full flex-col items-center justify-center rounded-l-lg glassmorphic-bg p-6">
					<div className="mb-8 text-center">
						<h1 className="mb-2 text-4xl font-bold text-gray-800 dark:text-gray-200">
							Welcome to Your Utility Toolkit
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{selectedSections.size === 0
								? "Select sections to download"
								: `${selectedSections.size} section${selectedSections.size === 1 ? "" : "s"} selected`}
						</p>
					</div>
					<div className="grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
						{HOME_SECTIONS.map(({ id, label }) => {
							const selected = selectedSections.has(id);
							const count =
								id === "events"
									? appState.calendar.events.length
									: id === "finance"
										? appState.expenses.expenses.length
										: appState.fileManager.files.length;
							const loaded =
								id === "events"
									? appState.calendar.loaded
									: id === "finance"
										? appState.finance.loaded &&
											appState.expenses.loaded
										: appState.fileManager.loaded;
							return (
								<button
									key={id}
									type="button"
									aria-pressed={selected}
									onClick={() => toggleSection(id)}
									className={`relative rounded-xl border bg-gradient-to-br p-5 text-left backdrop-blur-sm transition-all ${
										selected
											? "scale-[1.02] ring-2 ring-white/40 shadow-lg"
											: "opacity-50 hover:opacity-70"
									} ${
										id === "events"
											? "from-blue-500/20 to-blue-600/10 border-blue-500/30"
											: id === "finance"
												? "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30"
												: "from-purple-500/20 to-purple-600/10 border-purple-500/30"
									}`}
								>
									{loaded && (
										<span className="absolute left-3 top-3 text-xs text-green-400">
											●
										</span>
									)}
									<h2 className="mt-2 mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
										{label}
									</h2>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">
										{count}
									</p>
								</button>
							);
						})}
					</div>
					<div className="mt-6 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
						<button
							type="button"
							className="underline underline-offset-2"
							onClick={() =>
								setSelectedSections(
									new Set(HOME_SECTIONS.map(({ id }) => id)),
								)
							}
						>
							Select all
						</button>
						<span>·</span>
						<button
							type="button"
							className="underline underline-offset-2"
							onClick={() => setSelectedSections(new Set())}
						>
							Deselect all
						</button>
					</div>
					<div className="mt-8 max-w-md rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
						<p className="text-center text-sm text-blue-800 dark:text-blue-200">
							<strong>Tip:</strong> Select sections, then use
							Download to export what you need.
						</p>
					</div>
				</div>
			)}
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default Home;

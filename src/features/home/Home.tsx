import React, { useEffect, useState } from "react";
import Button from "@src/components/ui/button/Button";
import TitleWithButton from "@src/components/shared/title_with_button/TitleWithButton";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";
import {
	chooseOutputDirectory,
	getSelectedOutputDirectoryName,
} from "@src/lib/utils/fileStorage/outputDirectory";
import {
	isOPFSAvailable,
	isMobileStorage,
} from "@src/lib/utils/fileStorage/appData";

const Home: React.FC = () => {
	const { notifications, showNotification } = useNotifications();
	const [directoryName, setDirectoryName] = useState<string | null>(null);
	const [isSelecting, setIsSelecting] = useState(false);
	const mobileStorage = isMobileStorage();
	const opfsAvailable = isOPFSAvailable();

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

	return (
		<>
			<TitleWithButton heading="List Manager" />
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
					{mobileStorage ? (
						<div className="mt-3">
							<p className="text-sm text-gray-700 dark:text-gray-300">
								{opfsAvailable
									? "OPFS is the primary on-device store. IndexedDB is used for migration metadata and as a fallback."
									: "OPFS is unavailable in this browser. App data and generated files will use IndexedDB fallback storage."}
							</p>
							<p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
								Generated files are also downloaded so they can
								be accessed outside the app.
							</p>
						</div>
					) : (
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
					)}
				</section>
			</div>
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default Home;

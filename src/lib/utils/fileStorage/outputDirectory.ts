import { getFromIndexedDB, saveToIndexedDB } from "./database";
import {
	APP_DIRECTORY_NAME,
	getOPFSDirectory,
	isMobileStorage,
} from "./appData";

const OUTPUT_DIRECTORY_KEY = "selected_output_directory";

type WritableDirectoryHandle = FileSystemDirectoryHandle & {
	requestPermission?: (options: {
		mode: "readwrite";
	}) => Promise<PermissionState>;
	queryPermission?: (options: {
		mode: "readwrite";
	}) => Promise<PermissionState>;
};

type WindowWithDirectoryPicker = Window & {
	showDirectoryPicker?: (options: {
		mode: "readwrite";
	}) => Promise<FileSystemDirectoryHandle>;
};

export const chooseOutputDirectory = async (): Promise<string> => {
	const pickerWindow = window as WindowWithDirectoryPicker;
	if (!pickerWindow.showDirectoryPicker) {
		throw new Error(
			"Folder selection is not supported by this browser. Use a Chromium-based browser or mobile OPFS storage.",
		);
	}
	const directory = (await pickerWindow.showDirectoryPicker({
		mode: "readwrite",
	})) as WritableDirectoryHandle;
	if (directory.requestPermission) {
		const permission = await directory.requestPermission({
			mode: "readwrite",
		});
		if (permission !== "granted") {
			throw new Error("Write access to the selected folder was not granted.");
		}
	}
	await saveToIndexedDB(OUTPUT_DIRECTORY_KEY, directory);
	return directory.name;
};

export const getSelectedOutputDirectoryName = async (): Promise<
	string | null
> => {
	if (isMobileStorage()) return "On-device storage (OPFS)";
	const directory =
		await getFromIndexedDB<WritableDirectoryHandle>(OUTPUT_DIRECTORY_KEY);
	if (!directory) return null;
	return directory.name;
};

export const hasOutputDirectory = async (): Promise<boolean> => {
	if (isMobileStorage()) return true;
	return Boolean(
		await getFromIndexedDB<WritableDirectoryHandle>(OUTPUT_DIRECTORY_KEY),
	);
};

export const getOutputRootDirectory =
	async (): Promise<FileSystemDirectoryHandle> => {
		if (isMobileStorage()) {
			const root = await getOPFSDirectory();
			return root.getDirectoryHandle(APP_DIRECTORY_NAME, { create: true });
		}

		const selected =
			await getFromIndexedDB<WritableDirectoryHandle>(OUTPUT_DIRECTORY_KEY);
		if (!selected) {
			throw new Error("Select an output folder from the Home screen first.");
		}
		if (selected.queryPermission) {
			const permission = await selected.queryPermission({
				mode: "readwrite",
			});
			if (permission !== "granted") {
				throw new Error(
					"Folder access expired. Select the output folder again from Home.",
				);
			}
		}
		return selected.getDirectoryHandle(APP_DIRECTORY_NAME, { create: true });
	};

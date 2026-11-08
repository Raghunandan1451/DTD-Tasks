import { useCallback, useRef } from "react";

interface UseFilePickerOptions {
	accept: string;
	multiple?: boolean;
	onFiles: (files: File[]) => void | Promise<void>;
}

/**
 * Drives a hidden file input from a button. Spread `inputProps` onto the shared
 * `Input` (with an `id` and `aria-label`) and call `open()` from the button.
 * The input is cleared after each pick so choosing the same file again re-fires.
 */
export const useFilePicker = ({
	accept,
	multiple = false,
	onFiles,
}: UseFilePickerOptions) => {
	const ref = useRef<HTMLInputElement | null>(null);

	const open = useCallback(() => ref.current?.click(), []);

	const inputProps = {
		type: "file",
		accept,
		multiple,
		className: "hidden",
		inputRef: (el: HTMLInputElement | null) => {
			ref.current = el;
		},
		onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(event.target.files ?? []);
			event.target.value = "";
			if (files.length > 0) void onFiles(files);
		},
	};

	return { open, inputProps };
};

import { FC } from "react";
import Button from "@src/components/ui/button/Button";

/** Desktop only. Opens the data folder (the one with Notes, Boards, Journal, Finance...) in the file explorer. */
const OpenFolderButton: FC<{ showNotification: (message: string, type?: "info" | "error" | "success") => void }> = ({
	showNotification,
}) => {
	const open = async () => {
		try {
			await window.desktop?.shell.openFolder("");
		} catch {
			showNotification("Could not open the folder", "error");
		}
	};
	return (
		<Button
			type="button"
			className="btn-secondary text-xs md:text-base py-1.5 md:py-2 px-2.5 md:px-4"
			onClick={() => void open()}
			text="Open folder"
		/>
	);
};

export default OpenFolderButton;

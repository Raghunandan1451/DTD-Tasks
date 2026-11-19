import { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FolderOpen } from "lucide-react";
import { ConfirmationModal } from "@src/components/shared/dialog/ConfirmModal";
import { useConfirmationModal } from "@src/lib/hooks/useConfirmDialog";
import { flushPendingSaves } from "@src/lib/utils/persistMiddleware";
import { flushRegistered } from "@src/lib/utils/flushRegistry";

/**
 * Desktop only. Sits at the bottom of the side bar. Saves everything, forgets the
 * current data folder and reloads so the folder gate asks for another one.
 * The old folder is left untouched.
 */
const ChangeFolderButton: FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
	const desktop = window.desktop;
	const [path, setPath] = useState<string | null>(null);
	const confirmation = useConfirmationModal();

	useEffect(() => {
		if (!desktop) return;
		void desktop.folder.getState().then((state) => {
			if (state.status === "ready") setPath(state.path);
		});
	}, [desktop]);

	if (!desktop) return null;

	const changeFolder = async () => {
		const ok = await confirmation.confirm({
			title: "Change data folder?",
			message: `AIOLists will save your work, then ask you to pick another folder.${
				path ? ` Your current folder (${path}) is left exactly as it is.` : " Your current folder is left exactly as it is."
			}`,
			confirmText: "Choose another folder",
			cancelText: "Keep this folder",
			type: "info",
		});
		if (!ok) return;
		await Promise.all([flushPendingSaves(), flushRegistered()]);
		await desktop.folder.forget();
		window.location.reload();
	};

	return (
		<>
		<button
			type="button"
			onClick={() => void changeFolder()}
			title={path ? `Data folder: ${path}` : "Change data folder"}
			aria-label="Change data folder"
			className="glass-link flex w-full items-center gap-2 rounded-lg text-sm"
		>
			<FolderOpen className={collapsed ? "mx-auto h-5 w-5" : "h-4 w-4 shrink-0"} aria-hidden />
			{!collapsed && <span>Change folder</span>}
		</button>
		{createPortal(
			<ConfirmationModal
				isOpen={confirmation.isOpen}
				options={confirmation.options}
				onConfirm={confirmation.handleConfirm}
				onCancel={confirmation.handleCancel}
			/>,
			document.body,
		)}
		</>
	);
};

export default ChangeFolderButton;

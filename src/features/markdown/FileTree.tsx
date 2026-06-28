import React, { useState } from "react";
import TreeView, { SelectedItem } from "@src/features/markdown/TreeView";
import TreeToolbar from "@src/features/markdown/TreeToolbar";
import EditFileFolder from "@src/features/markdown/EditFileFolder";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import { useResizablePanel } from "@src/lib/hooks/useResizablePanel";
import { useTreeActions } from "@src/lib/hooks/useTreeActions";
import ResizeHandle from "@src/features/markdown/ResizeHandle";

const FileTree: React.FC = () => {
	const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

	const { width, containerRef, startDragging } = useResizablePanel();
	const {
		notifications,
		showInput,
		setShowInput,
		showRenameInput,
		renameValue,
		setRenameValue,
		onAdd,
		onEdit,
		onDelete,
		onConfirmRename,
		onCancelRename,
	} = useTreeActions(selectedItem, setSelectedItem);

	return (
		<div
			ref={containerRef}
			className="relative flex flex-col max-h-full shrink-0"
			style={{ width }}
		>
			<div className="border-r border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30 backdrop-blur-md shadow-sm flex flex-col h-full rounded-bl-xl overflow-hidden">
				<TreeToolbar
					selectedItem={selectedItem}
					onAdd={onAdd}
					onEdit={onEdit}
					onDelete={onDelete}
				/>

				<TreeView
					showInput={showInput}
					setShowInput={setShowInput}
					selectedItem={selectedItem}
					setSelectedItem={setSelectedItem}
				/>
			</div>

			{showRenameInput && selectedItem && (
				<EditFileFolder
					renameValue={renameValue.replace(/\.md$/, "")}
					setRenameValue={setRenameValue}
					setShowRenameInput={(show) => {
						if (!show) onCancelRename();
					}}
					onEdit={onConfirmRename}
				/>
			)}

			<NotificationCenter notifications={notifications} />
			<ResizeHandle onPointerDown={startDragging} />
		</div>
	);
};

export default FileTree;

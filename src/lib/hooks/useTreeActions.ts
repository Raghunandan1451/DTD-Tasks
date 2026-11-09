import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	handleDeleteFile,
	handleRenameFile,
	handleMoveItem,
	listFolderPaths,
} from "@src/lib/utils/treeUtils";
import { RootState } from "@src/lib/store/store";
import useNotifications from "@src/lib/hooks/useNotifications";
import { SelectedItem } from "@src/features/markdown/TreeView";

/**
 * Owns the toolbar's add/edit/delete actions and the rename-modal state.
 * Selection itself (selectedItem) is owned by the parent so it can be
 * shared with TreeView; this hook only acts on whatever is selected.
 */
export const useTreeActions = (
	selectedItem: SelectedItem | null,
	setSelectedItem: (item: SelectedItem | null) => void,
) => {
	const dispatch = useDispatch();
	const files = useSelector((state: RootState) => state.fileManager.files);
	const { notifications, showNotification } = useNotifications();

	const [showInput, setShowInput] = useState(false);
	const [showRenameInput, setShowRenameInput] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [showMove, setShowMove] = useState(false);
	const [moveDestination, setMoveDestination] = useState("");

	const onAdd = () => setShowInput(true);

	// Folders the selected item can go into: not itself or its own subfolders.
	const moveTargets = selectedItem
		? listFolderPaths(files).filter(
				(path) =>
					path !== selectedItem.fullPath &&
					!path.startsWith(`${selectedItem.fullPath}/`),
			)
		: [];

	const onMove = () => {
		if (!selectedItem) return;
		setMoveDestination("");
		setShowMove(true);
	};

	const onConfirmMove = () => {
		if (!selectedItem) return;
		const moved = handleMoveItem(
			dispatch,
			files,
			selectedItem.fullPath,
			moveDestination,
			showNotification,
		);
		if (moved) {
			// The item's path changed, so the old selection no longer points at it.
			setSelectedItem(null);
			setShowMove(false);
		}
	};

	const onCancelMove = () => setShowMove(false);

	const onEdit = () => {
		if (!selectedItem) return;
		setRenameValue(selectedItem.name);
		setShowRenameInput(true);
	};

	const onDelete = () => {
		if (!selectedItem) return;
		handleDeleteFile(dispatch, selectedItem.fullPath, showNotification);
		setSelectedItem(null);
	};

	const onConfirmRename = () => {
		if (!selectedItem) return;
		handleRenameFile(
			dispatch,
			selectedItem.fullPath,
			renameValue,
			showNotification,
			selectedItem.type,
		);
		setShowRenameInput(false);
		setRenameValue("");
	};

	const onCancelRename = () => {
		setShowRenameInput(false);
		setRenameValue("");
	};

	return {
		notifications,
		showNotification,
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
		showMove,
		moveTargets,
		moveDestination,
		setMoveDestination,
		onMove,
		onConfirmMove,
		onCancelMove,
	};
};

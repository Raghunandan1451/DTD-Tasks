import { useState } from "react";
import { useDispatch } from "react-redux";
import { handleDeleteFile, handleRenameFile } from "@src/lib/utils/treeUtils";
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
	const { notifications, showNotification } = useNotifications();

	const [showInput, setShowInput] = useState(false);
	const [showRenameInput, setShowRenameInput] = useState(false);
	const [renameValue, setRenameValue] = useState("");

	const onAdd = () => setShowInput(true);

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
	};
};

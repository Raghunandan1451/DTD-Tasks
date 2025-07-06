import { useDispatch, useSelector } from "react-redux";

import CustomTable from "dev_garbage/Table/CustomTable";
import TitleWithButton from "@src/components/shared/Header/TitleWithButton";
import { handleDownloadPDF } from "@src/utils/downloadHandler";
import NotificationCenter from "@src/components/shared/Notifications/NotificationCenter";
import useNotifications from "@src/hooks/useNotifications";
import { RootState } from "@src/store/store";
import { Column, DeleteParams, RowData } from "@src/components/types/table";
import { addItem, deleteItem, updateItem } from "@src/store/shoppingSlice";

interface ShoppingProp {
	uid: string;
	productName: string;
	quantity: string;
	unit: string;
}

const columns: Column[] = [
	{
		key: "productName",
		type: "text",
		header: "Product Name",
		className: "w-1/2",
	},
	{
		key: "quantity",
		type: "number",
		header: "Quantity",
		className: "w-1/5",
	},
	{
		key: "unit",
		type: "dropdown",
		header: "Unit",
		options: ["PKT(s)", "PC(s)", "KG", "G", "L", "ML"],
		className: "w-1/5",
	},
];
const Shopping = () => {
	const shoppingList: ShoppingProp[] = useSelector(
		(state: RootState) => state.shopping
	);
	const dispatch = useDispatch();
	const { notifications, showNotification } = useNotifications();

	const formattedData: RowData[] = shoppingList.map((shopping) => ({
		...shopping,
	}));

	const handleUpdate = (id: string, key: string, value: string) => {
		if (!["uid", "productName", "quantity", "unit"].includes(key)) return;
		dispatch(updateItem({ id, key: key as keyof ShoppingProp, value })); // Dispatch Redux action
	};

	const handleAddRow = () => {
		dispatch(addItem({ productName: "", quantity: "", unit: "" })); // Dispatch Redux action
	};

	const handleDeleteRow = (parans: DeleteParams) => {
		dispatch(deleteItem(parans)); // Dispatch Redux action
	};

	const handleDownload = (heading: string) => {
		handleDownloadPDF(formattedData, columns, heading, showNotification);
	};

	return (
		<>
			<TitleWithButton
				heading="Shopping List"
				onDownload={handleDownload}
				buttonText="Download PDF"
			/>
			<CustomTable
				columns={columns}
				data={formattedData}
				onUpdate={handleUpdate}
				onAddRow={handleAddRow}
				onDeleteRow={handleDeleteRow}
				showNotification={showNotification}
			/>
			<NotificationCenter notifications={notifications} />
		</>
	);
};

export default Shopping;

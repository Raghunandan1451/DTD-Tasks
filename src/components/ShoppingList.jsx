/* eslint-disable react/prop-types */
import EditableTable from '@components/Table/EditableTable';
import { useDispatch, useSelector } from 'react-redux';
import { addItem, deleteItem, updateItem } from '@store/shoppingSlice';
import HeaderWithButton from '@components/HeaderWithButton';
import { handleDownloadPDF } from '@utils/downloadList';

const columns = [
	{
		key: 'productName',
		type: 'text',
		header: 'Product Name',
		className: 'w-1/2',
	},
	{
		key: 'quantity',
		type: 'number',
		header: 'Quantity',
		className: 'w-1/5',
	},
	{
		key: 'unit',
		type: 'dropdown',
		header: 'Unit',
		options: ['PKT(s)', 'PC(s)', 'KG', 'G', 'L', 'ML'],
		className: 'w-1/5',
	},
];

const ShoppingList = () => {
	const shoppingList = useSelector((state) => state.shopping);
	const dispatch = useDispatch();

	const handleUpdate = (id, key, value) => {
		dispatch(updateItem({ id, key, value })); // Dispatch Redux action
	};

	const handleAddRow = () => {
		dispatch(addItem({ productName: '', quantity: '', unit: '' })); // Dispatch Redux action
	};

	const handleDeleteRow = (id) => {
		dispatch(deleteItem(id)); // Dispatch Redux action
	};

	const handleDownload = (heading) => {
		handleDownloadPDF(shoppingList, columns, heading);
	};
	return (
		<>
			<HeaderWithButton
				heading="Shopping List"
				onDownload={handleDownload}
			/>
			<EditableTable
				columns={columns}
				data={shoppingList}
				onUpdate={handleUpdate}
				onAddRow={handleAddRow}
				onDeleteRow={handleDeleteRow}
			/>
		</>
	);
};

export default ShoppingList;

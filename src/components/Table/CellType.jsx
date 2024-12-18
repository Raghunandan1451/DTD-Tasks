import DatePicker from '@components/Table/Fields/DatePicker';
import Dropdown from '@components/Table/Fields/Dropdown';
import TextInput from '@components/Table/Fields/TextInput';

const CellType = (props) => {
	const { columnType } = props;

	switch (columnType) {
		case 'text':
			return <TextInput {...props} />;
		case 'date':
			return <DatePicker {...props} />;
		case 'dropdown':
			return <Dropdown {...props} />;
		default:
			return <span></span>;
	}
};

export default CellType;

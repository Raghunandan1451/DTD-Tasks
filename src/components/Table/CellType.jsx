import DatePicker from '@components/Table/Fields/DatePicker';
import Dropdown from '@components/Table/Fields/Dropdown';
import TextInput from '@components/Table/Fields/TextInput';
import NumericInput from '@components/Table/Fields/NumericInput';

const CellType = (props) => {
	const { columnType } = props;

	switch (columnType) {
		case 'text':
			return <TextInput {...props} />;
		case 'date':
			return <DatePicker {...props} />;
		case 'dropdown':
			return <Dropdown {...props} />;
		case 'number':
			return <NumericInput {...props}></NumericInput>;
		default:
			return <span></span>;
	}
};

export default CellType;

import DatePicker from './Fields/DatePicker';
import Dropdown from './Fields/Dropdown';
import TextInput from './Fields/TextInput';

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
			return <TextInput {...props} />;
	}
};

export default CellType;

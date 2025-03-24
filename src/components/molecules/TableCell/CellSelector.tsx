import DatePickerCell from '@src/components/molecules/TableCell/DatePickerCell';
import NumericInputCell from '@src/components/molecules/TableCell/NumericInputCell';
import TextInputCell from '@src/components/molecules/TableCell/TextInputCell';
import DropdownCell from '@src/components/molecules/TableCell/DropdownCell';
import React from 'react';
import { BaseCellProps } from '@components/shared/table';

interface CellTypesProps extends BaseCellProps {
	columnType: string;
}

const CellSelector: React.FC<CellTypesProps> = (props) => {
	const { columnType, ...rest } = props;

	switch (columnType) {
		case 'text':
			return <TextInputCell {...rest} />;
		case 'date':
			return <DatePickerCell {...rest} />;
		case 'dropdown':
			return <DropdownCell {...rest} />;
		case 'number':
			return <NumericInputCell {...rest} />;
		default:
			return <span></span>;
	}
};

export default CellSelector;

import { TypedUseSelectorHook, useSelector } from 'react-redux';
import { RootState } from '@src/store/store'; // Ensure this path is correct

export const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

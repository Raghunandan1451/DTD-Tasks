import { TypedUseSelectorHook, useSelector } from "react-redux";
import { RootState } from "@src/lib/store/store"; // Ensure this path is correct

export const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

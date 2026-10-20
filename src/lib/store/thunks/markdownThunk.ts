import { createAsyncThunk } from "@reduxjs/toolkit";
import { getAppData } from "@src/lib/utils/fileStorage/appData";
import {
	markFileManagerLoaded,
	setFileState,
} from "@src/lib/store/slices/markdownSlice";
import type { FileState } from "@src/features/markdown/type";

export const hydrateMarkdown = createAsyncThunk(
	"fileManager/hydrate",
	async (_, { dispatch }) => {
		const data = await getAppData<FileState>("redux_markdown_data");

		if (data) dispatch(setFileState(data));
		else {
			dispatch(markFileManagerLoaded());
			console.warn("[Hydrate] No markdown data found");
		}
	}
);

import { createAsyncThunk } from "@reduxjs/toolkit";
import { getFromIndexedDB } from "@src/lib/utils/persistMiddleware";
import { setFileState } from "@src/lib/store/slices/markdownSlice";
import type { FileState } from "@src/lib/types/markdown";

export const hydrateMarkdown = createAsyncThunk(
	"fileManager/hydrate",
	async (_, { dispatch }) => {
		const data = await getFromIndexedDB<FileState>("redux_markdown_data");

		if (data) dispatch(setFileState(data));
		else console.warn("[Hydrate] No data found");
	}
);

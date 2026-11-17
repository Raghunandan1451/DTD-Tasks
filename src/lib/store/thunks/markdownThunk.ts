import { createAsyncThunk } from "@reduxjs/toolkit";
import { getNotesStore } from "@src/lib/storage";
import { setFileState } from "@src/lib/store/slices/markdownSlice";

export const hydrateMarkdown = createAsyncThunk(
	"fileManager/hydrate",
	async (_, { dispatch }) => {
		const data = await getNotesStore().loadTree();

		if (data) dispatch(setFileState(data));
		else console.warn("[Hydrate] No data found");
	}
);

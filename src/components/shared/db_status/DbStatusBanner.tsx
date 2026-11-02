import React, { useSyncExternalStore } from "react";
import {
	DbStatus,
	getDbStatus,
	subscribeDbStatus,
} from "@src/lib/db/database";

const MESSAGES: Record<Exclude<DbStatus, "idle">, string> = {
	blocked:
		"Close other DTD Tasks tabs to finish updating your local data. Saving is paused until then.",
	error:
		"Couldn't read or save your local data. Storage may be full or blocked; recent changes might not be saved.",
};

const DbStatusBanner: React.FC = () => {
	const status = useSyncExternalStore(subscribeDbStatus, getDbStatus);
	if (status === "idle") return null;

	return (
		<div
			role="alert"
			className="fixed top-0 inset-x-0 z-[60] px-4 py-2 text-center text-sm font-medium text-white bg-red-600/90 backdrop-blur-sm"
		>
			{MESSAGES[status]}
		</div>
	);
};

export default DbStatusBanner;
